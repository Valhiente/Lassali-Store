import { NextResponse } from "next/server";
import { products } from "@/lib/catalog";
import { createClient, createSecretClient } from "@/lib/supabase/server";

type IncomingItem = { sku?: string; slug?: string; color?: string; size?: string; quantity?: number };
type StockRow = { sku: string; stock: number; reserved_stock: number; unit_safety_stock: number };

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 50_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const body = await request.json().catch(() => null);
  const token = typeof body?.sessionToken === "string" ? body.sessionToken : "";
  const incoming = Array.isArray(body?.items) ? body.items.slice(0, 50) as IncomingItem[] : [];
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: "Invalid cart token" }, { status: 400 });
  const secret = createSecretClient();
  if (!secret) return NextResponse.json({ synced: false, reason: "not_configured" });
  const supabase = await createClient();
  const { data: claims } = supabase ? await supabase.auth.getClaims() : { data: null };
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  const { data: cart, error } = await secret.from("carts").upsert({
    session_token: token,
    ...(userId ? { user_id: userId } : {}),
    status: "active",
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "session_token" }).select("id").single();
  if (error || !cart) return NextResponse.json({ error: "Cart sync failed" }, { status: 500 });

  const forbodySkus = incoming.flatMap((item) => {
    const product = products.find((entry) => entry.slug === item.slug);
    return product?.storefront === "forbody" && item.sku ? [String(item.sku).slice(0, 180)] : [];
  });
  const { data: stockRows } = forbodySkus.length
    ? await secret.from("product_variants").select("sku, stock, reserved_stock, unit_safety_stock").in("sku", forbodySkus)
    : { data: [] };
  const retailStock = new Map((stockRows as StockRow[] || []).map((row) => [row.sku, Math.max(row.stock - row.reserved_stock - row.unit_safety_stock, 0)]));
  const rejectedSkus: string[] = [];

  const validItems = incoming.flatMap((item) => {
    const product = products.find((entry) => entry.slug === item.slug);
    const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, 99));
    const sku = String(item.sku || "").slice(0, 180);
    if (!product || !sku || !product.colors.includes(String(item.color)) || !product.sizes.includes(String(item.size))) return [];
    if (product.storefront === "forbody" && (retailStock.get(sku) || 0) < quantity) {
      rejectedSkus.push(sku);
      return [];
    }
    return [{
      cart_id: cart.id,
      sku,
      product_slug: product.slug,
      product_name: product.name,
      image_url: product.image || null,
      color: item.color,
      size: item.size,
      quantity,
      unit_price: product.retailPrice,
      updated_at: new Date().toISOString(),
    }];
  });
  await secret.from("cart_items").delete().eq("cart_id", cart.id);
  if (validItems.length) await secret.from("cart_items").insert(validItems);
  await secret.from("commerce_events").insert({
    session_token: token,
    user_id: userId,
    event_name: "cart_updated",
    entity_id: cart.id,
    properties: { item_count: validItems.reduce((sum, item) => sum + item.quantity, 0), rejected_skus: rejectedSkus },
  });
  return NextResponse.json({ synced: true, cartId: cart.id, rejectedSkus });
}
