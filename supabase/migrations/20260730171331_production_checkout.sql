-- Production checkout, complete inventory coverage and explicit access controls.

alter table public.orders
  add column if not exists cart_id uuid references public.carts(id) on delete set null,
  add column if not exists shipping_address jsonb not null default '{}'::jsonb,
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  add column if not exists payment_updated_at timestamptz;

create unique index if not exists orders_cart_unique_idx
  on public.orders (cart_id) where cart_id is not null and status <> 'cancelled';

-- Cover every foreign key used by account, checkout, lifecycle and audit queries.
create index if not exists account_access_approved_by_idx on public.account_access (approved_by);
create index if not exists addresses_user_id_idx on public.addresses (user_id);
create index if not exists admin_audit_actor_idx on public.admin_audit_logs (actor_user_id);
create index if not exists admin_audit_target_idx on public.admin_audit_logs (target_user_id);
create index if not exists admin_audit_organization_idx on public.admin_audit_logs (organization_id);
create index if not exists campaign_cart_idx on public.campaign_messages (cart_id);
create index if not exists campaign_order_idx on public.campaign_messages (order_id);
create index if not exists campaign_user_idx on public.campaign_messages (user_id);
create index if not exists carts_converted_order_idx on public.carts (converted_order_id);
create index if not exists carts_user_idx on public.carts (user_id);
create index if not exists inventory_movements_actor_idx on public.inventory_movements (actor_user_id);
create index if not exists inventory_movements_order_idx on public.inventory_movements (order_id);
create index if not exists inventory_movements_organization_idx on public.inventory_movements (organization_id);
create index if not exists inventory_movements_reservation_idx on public.inventory_movements (reservation_id);
create index if not exists inventory_reservations_organization_idx on public.inventory_reservations (organization_id);
create index if not exists inventory_reservations_user_idx on public.inventory_reservations (user_id);
create index if not exists marketing_consents_user_idx on public.marketing_consents (user_id);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);
create index if not exists orders_organization_idx on public.orders (organization_id);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists organizations_reviewed_by_idx on public.organizations (reviewed_by);
create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists products_category_idx on public.products (category_id);

-- Service-only tables intentionally deny browser roles. Explicit policies make
-- the deny-by-default design visible to database security tooling.
create policy "browser denied product prices" on public.product_prices
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied carts" on public.carts
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied cart items" on public.cart_items
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied suppressions" on public.marketing_suppressions
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied events" on public.commerce_events
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied campaign messages" on public.campaign_messages
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied audit logs" on public.admin_audit_logs
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied reservations" on public.inventory_reservations
  for all to anon, authenticated using (false) with check (false);
create policy "browser denied movements" on public.inventory_movements
  for all to anon, authenticated using (false) with check (false);

-- Lassali catalog variants start at zero: production sales remain blocked until
-- physical stock is received through the audited admin workflow.
insert into public.categories (name, slug, storefront, position, active) values
  ('Conjuntos', 'conjuntos-lassali', 'lassali', 10, true),
  ('Leggings', 'leggings-lassali', 'lassali', 20, true),
  ('Shorts', 'shorts-lassali', 'lassali', 30, true)
on conflict (slug) do update set name = excluded.name, active = true;

insert into public.products (
  category_id, name, slug, description, storefront,
  retail_enabled, wholesale_enabled, unit_enabled, active
)
select c.id, x.name, x.slug, x.description, 'lassali', true, true, false, true
from (values
  ('Conjunto Power', 'conjunto-power-preto', 'Top de alta sustentação e legging de cós alto.', 'conjuntos-lassali'),
  ('Legging Motion', 'legging-motion', 'Modelagem anatômica para treino e uso urbano.', 'leggings-lassali'),
  ('Short Essencial', 'short-essencial', 'Cós firme e liberdade de movimento.', 'shorts-lassali')
) as x(name, slug, description, category_slug)
join public.categories c on c.slug = x.category_slug
on conflict (slug) do update
  set retail_enabled = true, wholesale_enabled = true, active = true;

with variants(product_slug, sku, color, size) as (values
  ('conjunto-power-preto','conjunto-power-preto-preto-p','Preto','P'),
  ('conjunto-power-preto','conjunto-power-preto-preto-m','Preto','M'),
  ('conjunto-power-preto','conjunto-power-preto-preto-g','Preto','G'),
  ('conjunto-power-preto','conjunto-power-preto-preto-gg','Preto','GG'),
  ('conjunto-power-preto','conjunto-power-preto-cafe-p','Café','P'),
  ('conjunto-power-preto','conjunto-power-preto-cafe-m','Café','M'),
  ('conjunto-power-preto','conjunto-power-preto-cafe-g','Café','G'),
  ('conjunto-power-preto','conjunto-power-preto-cafe-gg','Café','GG'),
  ('conjunto-power-preto','conjunto-power-preto-vinho-p','Vinho','P'),
  ('conjunto-power-preto','conjunto-power-preto-vinho-m','Vinho','M'),
  ('conjunto-power-preto','conjunto-power-preto-vinho-g','Vinho','G'),
  ('conjunto-power-preto','conjunto-power-preto-vinho-gg','Vinho','GG'),
  ('legging-motion','legging-motion-preto-p','Preto','P'),
  ('legging-motion','legging-motion-preto-m','Preto','M'),
  ('legging-motion','legging-motion-preto-g','Preto','G'),
  ('legging-motion','legging-motion-preto-gg','Preto','GG'),
  ('legging-motion','legging-motion-azul-profundo-p','Azul profundo','P'),
  ('legging-motion','legging-motion-azul-profundo-m','Azul profundo','M'),
  ('legging-motion','legging-motion-azul-profundo-g','Azul profundo','G'),
  ('legging-motion','legging-motion-azul-profundo-gg','Azul profundo','GG'),
  ('short-essencial','short-essencial-preto-p','Preto','P'),
  ('short-essencial','short-essencial-preto-m','Preto','M'),
  ('short-essencial','short-essencial-preto-g','Preto','G'),
  ('short-essencial','short-essencial-verde-oliva-p','Verde oliva','P'),
  ('short-essencial','short-essencial-verde-oliva-m','Verde oliva','M'),
  ('short-essencial','short-essencial-verde-oliva-g','Verde oliva','G'),
  ('short-essencial','short-essencial-rosa-p','Rosa','P'),
  ('short-essencial','short-essencial-rosa-m','Rosa','M'),
  ('short-essencial','short-essencial-rosa-g','Rosa','G')
)
insert into public.product_variants (
  product_id, sku, color, size, stock, low_stock_threshold, active
)
select p.id, v.sku, v.color, v.size, 0, 5, true
from variants v
join public.products p on p.slug = v.product_slug
on conflict (sku) do update
  set color = excluded.color, size = excluded.size, active = true;

create or replace function public.create_retail_checkout(
  p_user_id uuid,
  p_session_token uuid,
  p_shipping_address jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_cart public.carts%rowtype;
  v_order_id uuid;
  v_item record;
  v_total numeric(12,2) := 0;
  v_channel public.order_channel;
  v_has_lassali boolean;
begin
  if not exists (
    select 1 from public.account_access
    where user_id = p_user_id and status = 'active'
      and kind in ('retail', 'wholesale', 'admin')
  ) then raise exception 'Conta não autorizada para compra'; end if;

  if coalesce(p_shipping_address->>'postalCode', '') !~ '^[0-9]{8}$'
    or length(coalesce(p_shipping_address->>'street', '')) < 2
    or length(coalesce(p_shipping_address->>'number', '')) < 1
    or length(coalesce(p_shipping_address->>'city', '')) < 2
    or coalesce(p_shipping_address->>'state', '') !~ '^[A-Z]{2}$'
  then raise exception 'Endereço de entrega inválido'; end if;

  select * into v_cart from public.carts
  where session_token = p_session_token and status in ('active', 'abandoned')
  for update;
  if not found then raise exception 'Sacola não encontrada'; end if;
  if not exists (select 1 from public.cart_items where cart_id = v_cart.id)
  then raise exception 'Sacola vazia'; end if;

  select o.id into v_order_id from public.orders o
  where o.cart_id = v_cart.id and o.status <> 'cancelled'
  limit 1;
  if found then
    return jsonb_build_object(
      'orderId', v_order_id,
      'total', (select total from public.orders where id = v_order_id),
      'reused', true
    );
  end if;

  select exists (
    select 1 from public.cart_items ci
    join public.products p on p.slug = ci.product_slug
    where ci.cart_id = v_cart.id and p.storefront = 'lassali'
  ) into v_has_lassali;
  v_channel := case when v_has_lassali then 'retail' else 'forbody_retail' end;

  insert into public.orders (
    user_id, cart_id, channel, status, shipping_address,
    payment_provider, payment_status
  ) values (
    p_user_id, v_cart.id, v_channel, 'pending_payment', p_shipping_address,
    'mercado_pago', 'pending'
  ) returning id into v_order_id;

  for v_item in
    select
      ci.*, v.id as variant_id, p.category_id, c.name as category_name
    from public.cart_items ci
    join public.products p
      on p.slug = ci.product_slug and p.active and p.retail_enabled
    join public.product_variants v
      on v.sku = ci.sku and v.product_id = p.id and v.active
    left join public.categories c on c.id = p.category_id
    where ci.cart_id = v_cart.id
    order by ci.sku
  loop
    perform public.reserve_inventory(
      v_item.variant_id, v_item.quantity, v_channel, 'order',
      v_order_id::text, p_user_id, null, now() + interval '30 minutes'
    );
    insert into public.order_items (
      order_id, variant_id, product_slug, product_name, sku, category,
      quantity, unit_price, total
    ) values (
      v_order_id, v_item.variant_id, v_item.product_slug, v_item.product_name,
      v_item.sku, v_item.category_name, v_item.quantity, v_item.unit_price,
      round(v_item.unit_price * v_item.quantity, 2)
    );
    v_total := v_total + round(v_item.unit_price * v_item.quantity, 2);
  end loop;

  if (select count(*) from public.order_items where order_id = v_order_id)
     <> (select count(*) from public.cart_items where cart_id = v_cart.id)
  then raise exception 'Um ou mais produtos estão indisponíveis'; end if;

  update public.orders
    set subtotal = v_total, total = v_total, updated_at = now()
    where id = v_order_id;
  update public.carts
    set user_id = p_user_id, updated_at = now()
    where id = v_cart.id;
  insert into public.commerce_events (
    session_token, user_id, event_name, entity_id, properties
  ) values (
    p_session_token, p_user_id, 'checkout_started', v_order_id::text,
    jsonb_build_object('total', v_total, 'channel', v_channel)
  );
  return jsonb_build_object('orderId', v_order_id, 'total', v_total, 'reused', false);
end; $$;

create or replace function public.cancel_retail_checkout(
  p_order_id uuid,
  p_reason text default 'Checkout cancelado'
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_reservation record;
begin
  if exists (
    select 1 from public.orders
    where id = p_order_id and payment_status = 'approved'
  ) then return; end if;
  for v_reservation in
    select id from public.inventory_reservations
    where reference_type = 'order' and reference_id = p_order_id::text
      and status = 'active'
  loop
    perform public.release_inventory_reservation(
      v_reservation.id, null, left(coalesce(p_reason, 'Checkout cancelado'), 500)
    );
  end loop;
  update public.orders
    set status = 'cancelled', payment_status = 'cancelled',
        payment_updated_at = now(), updated_at = now()
    where id = p_order_id and payment_status <> 'approved';
end; $$;

create or replace function public.confirm_retail_payment(
  p_order_id uuid,
  p_payment_reference text
) returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_reservation record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_order.payment_status = 'approved' then return false; end if;
  if v_order.status <> 'pending_payment' then raise exception 'Pedido não está aguardando pagamento'; end if;

  for v_reservation in
    select id from public.inventory_reservations
    where reference_type = 'order' and reference_id = p_order_id::text
      and status = 'active'
    order by created_at
  loop
    perform public.commit_inventory_reservation(v_reservation.id, null);
  end loop;

  update public.orders set
    status = 'paid',
    payment_status = 'approved',
    payment_reference = left(p_payment_reference, 180),
    payment_updated_at = now(),
    updated_at = now()
  where id = p_order_id;
  update public.carts set
    status = 'converted',
    converted_order_id = p_order_id,
    updated_at = now()
  where id = v_order.cart_id;
  insert into public.commerce_events (
    user_id, event_name, entity_id, properties
  ) values (
    v_order.user_id, 'order_paid', p_order_id::text,
    jsonb_build_object('provider', 'mercado_pago')
  );
  return true;
end; $$;

revoke all on function public.create_retail_checkout(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_retail_checkout(uuid, text) from public, anon, authenticated;
revoke all on function public.confirm_retail_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.create_retail_checkout(uuid, uuid, jsonb) to service_role;
grant execute on function public.cancel_retail_checkout(uuid, text) to service_role;
grant execute on function public.confirm_retail_payment(uuid, text) to service_role;
