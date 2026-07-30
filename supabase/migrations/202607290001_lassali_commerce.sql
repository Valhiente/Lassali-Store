-- Lassali Commerce foundation.
-- Public profile fields and privileged access fields are intentionally separated.

create extension if not exists pgcrypto;

create type public.account_kind as enum ('retail', 'wholesale', 'forbody_unit', 'admin');
create type public.access_status as enum ('pending', 'active', 'blocked', 'rejected');
create type public.organization_kind as enum ('wholesale', 'forbody_unit');
create type public.order_channel as enum ('retail', 'wholesale', 'forbody_retail', 'forbody_unit');
create type public.order_status as enum ('draft', 'pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.cart_status as enum ('active', 'converted', 'abandoned', 'expired');
create type public.marketing_channel as enum ('email', 'whatsapp');
create type public.marketing_purpose as enum ('cart_recovery', 'offers', 'reorder', 'back_in_stock');
create type public.message_status as enum ('pending', 'sent', 'skipped', 'failed');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kind public.account_kind not null default 'retail',
  status public.access_status not null default 'active',
  admin_role text check (admin_role is null or admin_role in ('full_admin', 'commercial', 'stock', 'marketing', 'finance', 'support', 'viewer')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_requires_role check ((kind = 'admin' and admin_role is not null) or (kind <> 'admin' and admin_role is null))
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.organization_kind not null,
  legal_name text not null,
  trade_name text,
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  state_registration text,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  city text not null,
  state text not null check (char_length(state) = 2),
  social_profile text,
  expected_monthly_volume text,
  forbody_unit_slug text unique,
  status public.access_status not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'buyer' check (role in ('buyer', 'manager', 'viewer', 'finance')),
  status public.access_status not null default 'pending',
  invited_at timestamptz,
  accepted_at timestamptz,
  primary key (organization_id, user_id)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Principal',
  postal_code text not null,
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state text not null check (char_length(state) = 2),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
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
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  active boolean not null default true
);

-- Prices are server-only. The browser never selects this table directly.
create table public.product_prices (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  audience public.account_kind not null check (audience in ('retail', 'wholesale', 'forbody_unit')),
  amount numeric(12,2) not null check (amount >= 0),
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  primary key (variant_id, audience)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  session_token uuid not null unique,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  status public.cart_status not null default 'active',
  recovery_stage smallint not null default 0 check (recovery_stage between 0 and 3),
  last_activity_at timestamptz not null default now(),
  converted_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  sku text not null,
  product_slug text not null,
  product_name text not null,
  image_url text,
  color text,
  size text,
  quantity integer not null check (quantity > 0 and quantity <= 1000),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  updated_at timestamptz not null default now(),
  primary key (cart_id, sku)
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

alter table public.carts
  add constraint carts_converted_order_fk foreign key (converted_order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id),
  product_slug text not null,
  product_name text not null,
  sku text not null,
  category text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null check (total >= 0)
);

create table public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  normalized_contact text not null,
  channel public.marketing_channel not null,
  purpose public.marketing_purpose not null,
  granted boolean not null,
  source text not null,
  policy_version text not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_contact, channel, purpose)
);

create table public.marketing_suppressions (
  normalized_contact text not null,
  channel public.marketing_channel not null,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (normalized_contact, channel)
);

create table public.commerce_events (
  id bigint generated always as identity primary key,
  session_token uuid,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (event_name in ('account_created', 'wholesale_applied', 'cart_updated', 'cart_abandoned', 'checkout_started', 'order_created', 'order_paid', 'reorder_suggested')),
  entity_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  cart_id uuid references public.carts(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  channel public.marketing_channel not null,
  purpose public.marketing_purpose not null,
  recipient text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.message_status not null default 'pending',
  provider_message_id text,
  error_message text,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index carts_recovery_idx on public.carts (status, recovery_stage, last_activity_at);
create index orders_reorder_idx on public.orders (status, user_id, created_at desc);
create index campaign_pending_idx on public.campaign_messages (status, scheduled_for);
create index events_user_created_idx on public.commerce_events (user_id, created_at desc);
create index org_status_kind_idx on public.organizations (status, kind);

alter table public.profiles enable row level security;
alter table public.account_access enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_prices enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.marketing_consents enable row level security;
alter table public.marketing_suppressions enable row level security;
alter table public.commerce_events enable row level security;
alter table public.campaign_messages enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "users update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users read own access" on public.account_access for select to authenticated using ((select auth.uid()) = user_id);
create policy "members read own organization" on public.organizations for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = (select auth.uid()) and m.status = 'active'));
create policy "users read memberships" on public.organization_members for select to authenticated using (user_id = (select auth.uid()));
create policy "users manage own addresses" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "active categories public" on public.categories for select to anon, authenticated using (active);
create policy "active products public" on public.products for select to anon, authenticated using (active);
create policy "active variants public" on public.product_variants for select to anon, authenticated using (active);
create policy "users read own orders" on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy "users read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "users read own consents" on public.marketing_consents for select to authenticated using (user_id = (select auth.uid()));

grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, birth_date, updated_at) on public.profiles to authenticated;
grant select on public.account_access, public.organizations, public.organization_members, public.orders, public.order_items, public.marketing_consents to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;

-- Privileged and behavioral tables remain inaccessible to browser roles.
revoke all on public.product_prices, public.carts, public.cart_items, public.marketing_suppressions,
  public.commerce_events, public.campaign_messages, public.admin_audit_logs from anon, authenticated;

-- Prevent clients from changing email identity through a profile update.
