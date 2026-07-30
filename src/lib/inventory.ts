import "server-only";

import { createSecretClient } from "@/lib/supabase/server";

export type RetailStock = Record<string, Record<string, number>>;

export async function getForbodyRetailStock(): Promise<RetailStock> {
  const secret = createSecretClient();
  if (!secret) return {};
  const { data, error } = await secret
    .from("product_variants")
    .select("sku, retail_available, products!inner(slug, storefront)")
    .eq("active", true)
    .eq("products.storefront", "forbody");
  if (error || !data) return {};
  const stock: RetailStock = {};
  for (const row of data) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!product?.slug) continue;
    if (!stock[product.slug]) stock[product.slug] = {};
    stock[product.slug][row.sku] = Math.max(Number(row.retail_available), 0);
  }
  return stock;
}

export async function getForbodyRetailAvailability(): Promise<Record<string, string[]>> {
  const stock = await getForbodyRetailStock();
  return Object.fromEntries(
    Object.entries(stock).map(([slug, variants]) => [
      slug,
      Object.entries(variants).flatMap(([sku, quantity]) => quantity > 0 ? [sku] : []),
    ]),
  );
}
