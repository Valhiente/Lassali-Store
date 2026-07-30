alter function public.create_retail_checkout(uuid, uuid, jsonb)
  rename to create_retail_checkout_unchecked;

revoke all on function public.create_retail_checkout_unchecked(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_retail_checkout_unchecked(uuid, uuid, jsonb)
  to service_role;

create or replace function public.create_retail_checkout(
  p_user_id uuid,
  p_session_token uuid,
  p_shipping_address jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if exists (
    select 1 from public.carts
    where session_token = p_session_token
      and user_id is not null
      and user_id <> p_user_id
  ) then raise exception 'Sacola pertence a outra conta'; end if;
  return public.create_retail_checkout_unchecked(
    p_user_id, p_session_token, p_shipping_address
  );
end; $$;

revoke all on function public.create_retail_checkout(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_retail_checkout(uuid, uuid, jsonb)
  to service_role;

create or replace function public.expire_retail_checkouts()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_order record;
  v_count integer := 0;
begin
  for v_order in
    select id from public.orders
    where status = 'pending_payment'
      and payment_status = 'pending'
      and created_at <= now() - interval '30 minutes'
    order by created_at
    for update skip locked
  loop
    perform public.cancel_retail_checkout(v_order.id, 'Prazo de pagamento expirado');
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

revoke all on function public.expire_retail_checkouts() from public, anon, authenticated;
grant execute on function public.expire_retail_checkouts() to service_role;
