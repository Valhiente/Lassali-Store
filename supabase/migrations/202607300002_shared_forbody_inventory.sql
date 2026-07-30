-- Shared central inventory for Forbody retail and franchise-unit replenishment.
-- Physical stock is shared; channel safety stock only changes what each channel can reserve.

create type public.inventory_reservation_status as enum ('active', 'committed', 'released', 'expired');
create type public.inventory_movement_type as enum ('receipt', 'reservation', 'release', 'sale', 'unit_dispatch', 'adjustment', 'return');

alter table public.product_variants
  add column reserved_stock integer not null default 0 check (reserved_stock >= 0),
  add column retail_safety_stock integer not null default 0 check (retail_safety_stock >= 0),
  add column unit_safety_stock integer not null default 0 check (unit_safety_stock >= 0),
  add column updated_at timestamptz not null default now(),
  add constraint reserved_not_above_physical check (reserved_stock <= stock);

alter table public.product_variants
  add column retail_available integer generated always as (
    greatest(stock - reserved_stock - unit_safety_stock, 0)
  ) stored;

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  channel public.order_channel not null,
  quantity integer not null check (quantity > 0),
  status public.inventory_reservation_status not null default 'active',
  reference_type text not null check (reference_type in ('cart', 'order', 'unit_order')),
  reference_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  expires_at timestamptz,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index inventory_active_reference_idx
  on public.inventory_reservations (variant_id, channel, reference_type, reference_id)
  where status = 'active';
create index inventory_expiration_idx on public.inventory_reservations (status, expires_at);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  physical_delta integer not null default 0,
  reserved_delta integer not null default 0,
  physical_before integer not null,
  physical_after integer not null,
  reserved_before integer not null,
  reserved_after integer not null,
  channel public.order_channel,
  reservation_id uuid references public.inventory_reservations(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);

alter table public.inventory_reservations enable row level security;
alter table public.inventory_movements enable row level security;
revoke all on public.inventory_reservations, public.inventory_movements from anon, authenticated;

-- Public clients may see catalog identity and retail availability, never internal allocation rules.
revoke select on public.product_variants from anon, authenticated;
grant select (id, product_id, sku, color, size, active, low_stock_threshold, retail_available) on public.product_variants to anon, authenticated;

create or replace view public.storefront_inventory
with (security_invoker = true)
as
select
  v.id as variant_id,
  v.product_id,
  v.sku,
  v.color,
  v.size,
  v.retail_available,
  v.retail_available > 0 as retail_in_stock
from public.product_variants v
where v.active;

grant select on public.storefront_inventory to anon, authenticated;

create or replace function public.receive_inventory(
  p_variant_id uuid,
  p_quantity integer,
  p_actor_user_id uuid,
  p_reason text default 'Compra recebida pela Forbody'
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_before public.product_variants%rowtype;
begin
  if p_quantity <= 0 then raise exception 'A quantidade deve ser positiva'; end if;
  select * into v_before from public.product_variants where id = p_variant_id for update;
  if not found then raise exception 'Variação não encontrada'; end if;
  update public.product_variants set stock = stock + p_quantity, updated_at = now() where id = p_variant_id;
  insert into public.inventory_movements (
    variant_id, movement_type, physical_delta, physical_before, physical_after,
    reserved_before, reserved_after, actor_user_id, reason
  ) values (
    p_variant_id, 'receipt', p_quantity, v_before.stock, v_before.stock + p_quantity,
    v_before.reserved_stock, v_before.reserved_stock, p_actor_user_id, left(coalesce(nullif(p_reason, ''), 'Entrada de estoque'), 500)
  );
end; $$;

create or replace function public.reserve_inventory(
  p_variant_id uuid,
  p_quantity integer,
  p_channel public.order_channel,
  p_reference_type text,
  p_reference_id text,
  p_user_id uuid default null,
  p_organization_id uuid default null,
  p_expires_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_variant public.product_variants%rowtype;
  v_available integer;
  v_reservation_id uuid;
begin
  if p_quantity <= 0 then raise exception 'A quantidade deve ser positiva'; end if;
  if p_reference_type not in ('cart', 'order', 'unit_order') then raise exception 'Referência inválida'; end if;
  select * into v_variant from public.product_variants where id = p_variant_id and active for update;
  if not found then raise exception 'Variação indisponível'; end if;

  v_available := v_variant.stock - v_variant.reserved_stock - case
    when p_channel = 'forbody_unit' then v_variant.retail_safety_stock
    else v_variant.unit_safety_stock
  end;
  if v_available < p_quantity then raise exception 'Estoque insuficiente para este canal'; end if;

  insert into public.inventory_reservations (
    variant_id, channel, quantity, reference_type, reference_id, user_id,
    organization_id, expires_at
  ) values (
    p_variant_id, p_channel, p_quantity, p_reference_type, left(p_reference_id, 180),
    p_user_id, p_organization_id, p_expires_at
  ) returning id into v_reservation_id;

  update public.product_variants
    set reserved_stock = reserved_stock + p_quantity, updated_at = now()
    where id = p_variant_id;

  insert into public.inventory_movements (
    variant_id, movement_type, reserved_delta, physical_before, physical_after,
    reserved_before, reserved_after, channel, reservation_id, organization_id,
    actor_user_id, reason
  ) values (
    p_variant_id, 'reservation', p_quantity, v_variant.stock, v_variant.stock,
    v_variant.reserved_stock, v_variant.reserved_stock + p_quantity, p_channel,
    v_reservation_id, p_organization_id, p_user_id, 'Reserva de estoque'
  );
  return v_reservation_id;
end; $$;

create or replace function public.release_inventory_reservation(
  p_reservation_id uuid,
  p_actor_user_id uuid default null,
  p_reason text default 'Reserva liberada'
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_reservation public.inventory_reservations%rowtype;
  v_variant public.product_variants%rowtype;
begin
  select * into v_reservation from public.inventory_reservations where id = p_reservation_id for update;
  if not found or v_reservation.status <> 'active' then return; end if;
  select * into v_variant from public.product_variants where id = v_reservation.variant_id for update;
  update public.product_variants set reserved_stock = reserved_stock - v_reservation.quantity, updated_at = now() where id = v_variant.id;
  update public.inventory_reservations set status = 'released', released_at = now(), updated_at = now() where id = p_reservation_id;
  insert into public.inventory_movements (
    variant_id, movement_type, reserved_delta, physical_before, physical_after,
    reserved_before, reserved_after, channel, reservation_id, organization_id,
    actor_user_id, reason
  ) values (
    v_variant.id, 'release', -v_reservation.quantity, v_variant.stock, v_variant.stock,
    v_variant.reserved_stock, v_variant.reserved_stock - v_reservation.quantity,
    v_reservation.channel, p_reservation_id, v_reservation.organization_id,
    p_actor_user_id, left(coalesce(nullif(p_reason, ''), 'Reserva liberada'), 500)
  );
end; $$;

create or replace function public.commit_inventory_reservation(
  p_reservation_id uuid,
  p_actor_user_id uuid default null
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_reservation public.inventory_reservations%rowtype;
  v_variant public.product_variants%rowtype;
  v_order_id uuid;
  v_type public.inventory_movement_type;
begin
  select * into v_reservation from public.inventory_reservations where id = p_reservation_id for update;
  if not found or v_reservation.status <> 'active' then raise exception 'Reserva não está ativa'; end if;
  select * into v_variant from public.product_variants where id = v_reservation.variant_id for update;
  if v_variant.stock < v_reservation.quantity or v_variant.reserved_stock < v_reservation.quantity then
    raise exception 'Saldo inconsistente';
  end if;
  v_order_id := case when v_reservation.reference_type in ('order', 'unit_order') then v_reservation.reference_id::uuid else null end;
  v_type := case when v_reservation.channel = 'forbody_unit' then 'unit_dispatch'::public.inventory_movement_type else 'sale'::public.inventory_movement_type end;
  update public.product_variants set
    stock = stock - v_reservation.quantity,
    reserved_stock = reserved_stock - v_reservation.quantity,
    updated_at = now()
  where id = v_variant.id;
  update public.inventory_reservations set status = 'committed', committed_at = now(), updated_at = now() where id = p_reservation_id;
  insert into public.inventory_movements (
    variant_id, movement_type, physical_delta, reserved_delta, physical_before,
    physical_after, reserved_before, reserved_after, channel, reservation_id,
    order_id, organization_id, actor_user_id, reason
  ) values (
    v_variant.id, v_type, -v_reservation.quantity, -v_reservation.quantity,
    v_variant.stock, v_variant.stock - v_reservation.quantity,
    v_variant.reserved_stock, v_variant.reserved_stock - v_reservation.quantity,
    v_reservation.channel, p_reservation_id, v_order_id,
    v_reservation.organization_id, p_actor_user_id, 'Baixa de estoque confirmada'
  );
end; $$;

create or replace function public.expire_inventory_reservations()
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_item record; v_count integer := 0;
begin
  for v_item in
    select id from public.inventory_reservations
    where status = 'active' and expires_at is not null and expires_at <= now()
    order by expires_at for update skip locked
  loop
    perform public.release_inventory_reservation(v_item.id, null, 'Reserva expirada automaticamente');
    update public.inventory_reservations set status = 'expired' where id = v_item.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

create or replace function public.create_unit_stock_request(
  p_user_id uuid,
  p_organization_id uuid,
  p_variant_id uuid,
  p_quantity integer
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_product record;
  v_reservation_id uuid;
begin
  if not exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.user_id = p_user_id and m.organization_id = p_organization_id
      and m.status = 'active' and o.kind = 'forbody_unit' and o.status = 'active'
  ) then raise exception 'Unidade não autorizada'; end if;

  select v.sku, p.id as product_id, p.slug, p.name, c.name as category
  into v_product
  from public.product_variants v
  join public.products p on p.id = v.product_id
  left join public.categories c on c.id = p.category_id
  where v.id = p_variant_id and v.active and p.active and p.unit_enabled;
  if not found then raise exception 'Produto não disponível para unidades'; end if;

  insert into public.orders (user_id, organization_id, channel, status, subtotal, total)
  values (p_user_id, p_organization_id, 'forbody_unit', 'draft', 0, 0)
  returning id into v_order_id;

  insert into public.order_items (
    order_id, variant_id, product_slug, product_name, sku, category,
    quantity, unit_price, total
  ) values (
    v_order_id, p_variant_id, v_product.slug, v_product.name, v_product.sku,
    v_product.category, p_quantity, 0, 0
  );

  v_reservation_id := public.reserve_inventory(
    p_variant_id, p_quantity, 'forbody_unit', 'unit_order', v_order_id::text,
    p_user_id, p_organization_id, now() + interval '7 days'
  );
  insert into public.commerce_events (user_id, event_name, entity_id, properties)
  values (p_user_id, 'order_created', v_order_id::text, jsonb_build_object('channel', 'forbody_unit', 'reservation_id', v_reservation_id));
  return v_order_id;
end; $$;

revoke all on function public.receive_inventory(uuid, integer, uuid, text) from public, anon, authenticated;
revoke all on function public.reserve_inventory(uuid, integer, public.order_channel, text, text, uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.release_inventory_reservation(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.commit_inventory_reservation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.expire_inventory_reservations() from public, anon, authenticated;
revoke all on function public.create_unit_stock_request(uuid, uuid, uuid, integer) from public, anon, authenticated;

grant execute on function public.receive_inventory(uuid, integer, uuid, text) to service_role;
grant execute on function public.reserve_inventory(uuid, integer, public.order_channel, text, text, uuid, uuid, timestamptz) to service_role;
grant execute on function public.release_inventory_reservation(uuid, uuid, text) to service_role;
grant execute on function public.commit_inventory_reservation(uuid, uuid) to service_role;
grant execute on function public.expire_inventory_reservations() to service_role;
grant execute on function public.create_unit_stock_request(uuid, uuid, uuid, integer) to service_role;
grant all on public.inventory_reservations, public.inventory_movements to service_role;

-- Initial Forbody catalog records. Quantities start at zero and are added only by an audited receipt.
insert into public.categories (name, slug, storefront, position, active) values
  ('Camisetas', 'camisetas-forbody', 'forbody', 10, true),
  ('Bonés', 'bones-forbody', 'forbody', 20, true),
  ('Acessórios', 'acessorios-forbody', 'forbody', 30, true)
on conflict (slug) do update set name = excluded.name, active = true;

insert into public.products (category_id, name, slug, description, storefront, retail_enabled, unit_enabled, active)
select c.id, x.name, x.slug, x.description, 'forbody', true, true, true
from (values
  ('Camiseta Forbody Performance', 'camiseta-forbody-performance', 'Camiseta dry fit oficial para treino e equipe.', 'camisetas-forbody'),
  ('Boné Forbody Classic', 'bone-forbody-classic', 'Boné estruturado com identidade oficial Forbody.', 'bones-forbody'),
  ('Galão Forbody 2L', 'galao-forbody-2l', 'Galão oficial Forbody de dois litros.', 'acessorios-forbody')
) as x(name, slug, description, category_slug)
join public.categories c on c.slug = x.category_slug
on conflict (slug) do update set unit_enabled = true, retail_enabled = true, active = true;

with variants(product_slug, sku, color, size) as (values
  ('camiseta-forbody-performance','camiseta-forbody-performance-preto-p','Preto','P'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-preto-m','Preto','M'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-preto-g','Preto','G'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-preto-gg','Preto','GG'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-preto-xg','Preto','XG'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-branco-p','Branco','P'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-branco-m','Branco','M'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-branco-g','Branco','G'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-branco-gg','Branco','GG'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-branco-xg','Branco','XG'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-vermelho-p','Vermelho','P'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-vermelho-m','Vermelho','M'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-vermelho-g','Vermelho','G'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-vermelho-gg','Vermelho','GG'),
  ('camiseta-forbody-performance','camiseta-forbody-performance-vermelho-xg','Vermelho','XG'),
  ('bone-forbody-classic','bone-forbody-classic-preto-nico','Preto','Único'),
  ('galao-forbody-2l','galao-forbody-2l-preto-2l','Preto','2L'),
  ('galao-forbody-2l','galao-forbody-2l-vermelho-2l','Vermelho','2L')
)
insert into public.product_variants (product_id, sku, color, size, stock, low_stock_threshold, active)
select p.id, v.sku, v.color, v.size, 0, 5, true
from variants v join public.products p on p.slug = v.product_slug
on conflict (sku) do update set color = excluded.color, size = excluded.size, active = true;
