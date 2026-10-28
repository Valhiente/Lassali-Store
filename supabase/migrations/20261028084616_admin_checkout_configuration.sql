create extension if not exists supabase_vault with schema vault;

create table if not exists public.store_payment_settings (
  id boolean primary key default true check (id),
  provider text not null default 'mercado_pago' check (provider = 'mercado_pago'),
  environment text not null default 'test' check (environment in ('test', 'production')),
  flat_shipping numeric(12,2) not null default 24.90 check (flat_shipping >= 0),
  enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_payment_settings enable row level security;
revoke all on table public.store_payment_settings from public, anon, authenticated;
grant select, insert, update on table public.store_payment_settings to service_role;

insert into public.store_payment_settings (id)
values (true)
on conflict (id) do nothing;

create or replace function public.get_mercado_pago_checkout_config()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'environment', s.environment,
    'flatShipping', s.flat_shipping,
    'enabled', s.enabled,
    'accessToken', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'lassali_mercado_pago_access_token' limit 1), ''),
    'webhookSecret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'lassali_mercado_pago_webhook_secret' limit 1), ''),
    'updatedAt', s.updated_at
  )
  from public.store_payment_settings s
  where s.id = true;
$$;

create or replace function public.set_mercado_pago_checkout_config(
  p_environment text,
  p_flat_shipping numeric,
  p_enabled boolean,
  p_access_token text,
  p_webhook_secret text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_secret_id uuid;
  webhook_secret_id uuid;
begin
  if p_environment not in ('test', 'production') then
    raise exception 'Ambiente inválido';
  end if;
  if p_flat_shipping is null or p_flat_shipping < 0 or p_flat_shipping > 100000 then
    raise exception 'Frete inválido';
  end if;
  if not exists (
    select 1 from public.account_access
    where user_id = p_actor_user_id
      and kind = 'admin'
      and status = 'active'
      and admin_role in ('full_admin', 'finance')
  ) then
    raise exception 'Administrador sem permissão';
  end if;

  if nullif(trim(p_access_token), '') is not null then
    select id into access_secret_id from vault.secrets where name = 'lassali_mercado_pago_access_token' limit 1;
    if access_secret_id is null then
      perform vault.create_secret(trim(p_access_token), 'lassali_mercado_pago_access_token', 'Access Token do Checkout Pro da Lassali');
    else
      perform vault.update_secret(access_secret_id, trim(p_access_token));
    end if;
  end if;

  if nullif(trim(p_webhook_secret), '') is not null then
    select id into webhook_secret_id from vault.secrets where name = 'lassali_mercado_pago_webhook_secret' limit 1;
    if webhook_secret_id is null then
      perform vault.create_secret(trim(p_webhook_secret), 'lassali_mercado_pago_webhook_secret', 'Assinatura secreta do webhook Mercado Pago');
    else
      perform vault.update_secret(webhook_secret_id, trim(p_webhook_secret));
    end if;
  end if;

  insert into public.store_payment_settings (id, environment, flat_shipping, enabled, updated_by, updated_at)
  values (true, p_environment, round(p_flat_shipping, 2), p_enabled, p_actor_user_id, now())
  on conflict (id) do update set
    environment = excluded.environment,
    flat_shipping = excluded.flat_shipping,
    enabled = excluded.enabled,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.admin_audit_logs (actor_user_id, action, details)
  values (
    p_actor_user_id,
    'checkout.mercado_pago_updated',
    jsonb_build_object(
      'environment', p_environment,
      'flat_shipping', round(p_flat_shipping, 2),
      'enabled', p_enabled,
      'access_token_replaced', nullif(trim(p_access_token), '') is not null,
      'webhook_secret_replaced', nullif(trim(p_webhook_secret), '') is not null
    )
  );

  return public.get_mercado_pago_checkout_config();
end;
$$;

revoke all on function public.get_mercado_pago_checkout_config() from public, anon, authenticated;
revoke all on function public.set_mercado_pago_checkout_config(text, numeric, boolean, text, text, uuid) from public, anon, authenticated;
grant execute on function public.get_mercado_pago_checkout_config() to service_role;
grant execute on function public.set_mercado_pago_checkout_config(text, numeric, boolean, text, text, uuid) to service_role;
