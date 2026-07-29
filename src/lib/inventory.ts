import "server-only";

import { createSecretClient } from "@/lib/supabase/server";

export async function getForbodyRetailAvailability(): Promise<Record<string, string[]>> {
  const secret = createSecretClient();
  if (!secret) return {};
  const { data, error } = await secret
    .from("product_variants")
    .select("sku, stock, reserved_stock, unit_safety_stock, products!inner(slug, storefront)")
    .eq("active", true)
    .eq("products.storefront", "forbody");
  if (error || !data) return {};
  const availability: Record<string, string[]> = {};
  for (const row of data) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!product?.slug) continue;
    if (!availability[product.slug]) availability[product.slug] = [];
    const available = Number(row.stock) - Number(row.reserved_stock) - Number(row.unit_safety_stock);
    if (available > 0) availability[product.slug].push(row.sku);
  }
  return availability;
}
