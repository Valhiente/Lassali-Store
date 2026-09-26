import { NextResponse } from "next/server";
import { configuredShippingRate, mercadoPagoEnvironment } from "@/lib/mercado-pago";
import { createClient, createSecretClient } from "@/lib/supabase/server";

type CheckoutBody = {
  sessionToken?: unknown;
  fullName?: unknown;
  postalCode?: unknown;
  street?: unknown;
  number?: unknown;
  complement?: unknown;
  district?: unknown;
  city?: unknown;
  state?: unknown;
};

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) {
    return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  }
  const body = (await request.json().catch(() => null)) as CheckoutBody | null;
  const sessionToken = text(body?.sessionToken, 36);
  const shipping = {
    fullName: text(body?.fullName, 160),
    postalCode: text(body?.postalCode, 16).replace(/\D/g, ""),
    street: text(body?.street, 180),
    number: text(body?.number, 30),
    complement: text(body?.complement, 120),
    district: text(body?.district, 120),
    city: text(body?.city, 120),
    state: text(body?.state, 2).toUpperCase(),
  };
  if (
    !/^[0-9a-f-]{36}$/i.test(sessionToken) ||
    shipping.fullName.split(/\s+/).length < 2 ||
    !/^[0-9]{8}$/.test(shipping.postalCode) ||
    !shipping.street ||
    !shipping.number ||
    !shipping.district ||
    !shipping.city ||
    !/^[A-Z]{2}$/.test(shipping.state)
  ) {
    return NextResponse.json({ error: "Confira os dados de entrega." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: claims } = supabase ? await supabase.auth.getClaims() : { data: null };
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : "";
  if (!userId || !email) {
    return NextResponse.json({ error: "Entre na sua conta para continuar." }, { status: 401 });
  }
  const secret = createSecretClient();
  if (!secret) {
    return NextResponse.json({ error: "Pagamento temporariamente indisponível." }, { status: 503 });
  }

  const { data: checkout, error: checkoutError } = await secret.rpc("create_retail_checkout", {
    p_user_id: userId,
    p_session_token: sessionToken,
    p_shipping_address: shipping,
  });
  if (checkoutError || !checkout?.orderId) {
    const unavailable = checkoutError?.message?.toLowerCase().includes("estoque");
    return NextResponse.json(
      { error: unavailable ? "Um produto ficou sem estoque. Atualize sua sacola." : "Não foi possível preparar o pedido." },
      { status: unavailable ? 409 : 400 },
    );
  }

  const orderId = String(checkout.orderId);
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const shippingRate = configuredShippingRate();
  if (!accessToken || !siteUrl?.startsWith("https://") || shippingRate === null) {
    await secret.rpc("cancel_retail_checkout", {
      p_order_id: orderId,
      p_reason: "Provedor de pagamento não configurado",
    });
    return NextResponse.json(
      { error: "Pagamento ou entrega ainda não configurados neste ambiente." },
      { status: 503 },
    );
  }

  const { data: items, error: itemsError } = await secret
    .from("order_items")
    .select("sku, product_name, quantity, unit_price")
    .eq("order_id", orderId);
  if (itemsError || !items?.length) {
    await secret.rpc("cancel_retail_checkout", {
      p_order_id: orderId,
      p_reason: "Pedido sem itens válidos para pagamento",
    });
    return NextResponse.json({ error: "Não foi possível preparar os itens do pedido." }, { status: 409 });
  }

  const total = Number(checkout.total) + shippingRate;
  const { error: totalError } = await secret
    .from("orders")
    .update({ shipping: shippingRate, total, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("payment_status", "pending");
  if (totalError) {
    await secret.rpc("cancel_retail_checkout", {
      p_order_id: orderId,
      p_reason: "Falha ao registrar frete do checkout",
    });
    return NextResponse.json({ error: "Não foi possível calcular o total do pedido." }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `lassali-order-${orderId}`,
    },
    body: JSON.stringify({
      items: (items || []).map((item) => ({
        id: item.sku,
        title: item.product_name,
        currency_id: "BRL",
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
      })),
      payer: { email },
      shipments: {
        cost: shippingRate,
        mode: "not_specified",
        receiver_address: {
          zip_code: shipping.postalCode,
          street_name: shipping.street,
          street_number: shipping.number,
          city_name: shipping.city,
          state_name: shipping.state,
          country_name: "Brasil",
        },
      },
      external_reference: orderId,
      back_urls: {
        success: `${siteUrl}/checkout/sucesso?order=${orderId}`,
        pending: `${siteUrl}/checkout/sucesso?order=${orderId}&status=pending`,
        failure: `${siteUrl}/checkout?status=failure`,
      },
      auto_return: "approved",
      expires: true,
      expiration_date_to: expiresAt,
      notification_url: `${siteUrl}/api/webhooks/mercado-pago`,
      statement_descriptor: "LASSALI STORE",
      metadata: { order_id: orderId, user_id: userId },
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  const preference = preferenceResponse
    ? await preferenceResponse.json().catch(() => ({}))
    : {};
  const checkoutUrl = mercadoPagoEnvironment() === "production"
    ? preference.init_point
    : preference.sandbox_init_point;
  if (!preferenceResponse?.ok || typeof checkoutUrl !== "string") {
    await secret.rpc("cancel_retail_checkout", {
      p_order_id: orderId,
      p_reason: "Falha ao criar preferência no Mercado Pago",
    });
    return NextResponse.json({ error: "O Mercado Pago não aceitou a solicitação." }, { status: 502 });
  }

  await secret
    .from("orders")
    .update({ payment_reference: String(preference.id), updated_at: new Date().toISOString() })
    .eq("id", orderId);
  return NextResponse.json({ orderId, checkoutUrl });
}
