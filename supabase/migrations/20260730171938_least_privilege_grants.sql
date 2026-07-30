-- Supabase project defaults may grant broad table privileges. RLS still blocks
-- unauthorized rows, but explicit least-privilege grants reduce the attack
-- surface and make authorization independent from project-wide defaults.

revoke all on table
  public.profiles,
  public.account_access,
  public.organizations,
  public.organization_members,
  public.addresses,
  public.categories,
  public.products,
  public.product_variants,
  public.product_prices,
  public.carts,
  public.cart_items,
  public.orders,
  public.order_items,
  public.marketing_consents,
  public.marketing_suppressions,
  public.commerce_events,
  public.campaign_messages,
  public.admin_audit_logs,
  public.inventory_reservations,
  public.inventory_movements
from anon, authenticated;

grant select on public.categories, public.products to anon, authenticated;
grant select (
  id, product_id, sku, color, size, active, low_stock_threshold, retail_available
) on public.product_variants to anon, authenticated;
grant select on public.storefront_inventory to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, birth_date, updated_at)
  on public.profiles to authenticated;
grant select on
  public.account_access,
  public.organizations,
  public.organization_members,
  public.orders,
  public.order_items,
  public.marketing_consents
to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;

grant all on table
  public.profiles,
  public.account_access,
  public.organizations,
  public.organization_members,
  public.addresses,
  public.categories,
  public.products,
  public.product_variants,
  public.product_prices,
  public.carts,
  public.cart_items,
  public.orders,
  public.order_items,
  public.marketing_consents,
  public.marketing_suppressions,
  public.commerce_events,
  public.campaign_messages,
  public.admin_audit_logs,
  public.inventory_reservations,
  public.inventory_movements
to service_role;
