-- Lassali Store: retail, wholesale and Forbody unit commerce foundation.
create type public.customer_kind as enum ('retail', 'wholesale', 'forbody_unit', 'admin');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.order_channel as enum ('retail', 'wholesale', 'forbody_retail', 'forbody_unit');
create type public.order_status as enum ('draft', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  customer_kind public.customer_kind not null default 'retail',
  approval_status public.approval_status not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.customer_kind not null check (kind in ('wholesale', 'forbody_unit')),
  legal_name text not null,
  trade_name text,
  cnpj text not null unique,
  state_registration text,
  forbody_unit_slug text,
  approval_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'buyer' check (role in ('buyer', 'manager')),
  primary key (organization_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  storefront text not null default 'lassali' check (storefront in ('lassali', 'forbody')),
  position integer not null default 0,
  active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  storefront text not null default 'lassali' check (storefront in ('lassali', 'forbody')),
  retail_enabled boolean not null default true,
  wholesale_enabled boolean not null default false,
  unit_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  color text,
  size text,
  retail_price numeric(12,2) not null check (retail_price >= 0),
  wholesale_price numeric(12,2) check (wholesale_price >= 0),
  unit_price numeric(12,2) check (unit_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  organization_id uuid references public.organizations(id),
  channel public.order_channel not null,
  status public.order_status not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null check (total >= 0)
);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "active categories are public" on public.categories for select to anon, authenticated using (active);
create policy "active products are public" on public.products for select to anon, authenticated using (active);

-- Variant prices are intentionally not exposed to anon. The storefront receives
-- public prices through a server-side catalog endpoint; wholesale and unit prices
-- are selected only after fresh server authorization.
create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "users update own basic profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "members read their organizations" on public.organizations for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = (select auth.uid())));
create policy "members read memberships" on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read own orders" on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

grant select on public.categories, public.products to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.organizations, public.organization_members, public.orders, public.order_items to authenticated;
