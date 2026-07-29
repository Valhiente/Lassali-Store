import { NextResponse } from "next/server";
import { products } from "@/lib/catalog";
import { createClient, createSecretClient } from "@/lib/supabase/server";

type IncomingItem = { sku?: string; slug?: string; color?: string; size?: string; quantity?: number };

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
  await secret.from("cart_items").delete().eq("cart_id", cart.id);
  const validItems = incoming.flatMap((item) => {
    const product = products.find((entry) => entry.slug === item.slug);
    const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, 99));
    if (!product || !item.sku || !product.colors.includes(String(item.color)) || !product.sizes.includes(String(item.size))) return [];
    return [{
      cart_id: cart.id,
      sku: String(item.sku).slice(0, 180),
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
  if (validItems.length) await secret.from("cart_items").insert(validItems);
  await secret.from("commerce_events").insert({
    session_token: token,
    user_id: userId,
    event_name: "cart_updated",
    entity_id: cart.id,
    properties: { item_count: validItems.reduce((sum, item) => sum + item.quantity, 0) },
  });
  return NextResponse.json({ synced: true, cartId: cart.id });
}
