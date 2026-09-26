import { NextResponse } from "next/server";
import {
  mercadoPagoEnvironment,
  normalizePaymentStatus,
  validateMercadoPagoSignature,
} from "@/lib/mercado-pago";
import { createSecretClient } from "@/lib/supabase/server";
import { sendStoreEmail } from "@/lib/marketing";

function validSignature(request: Request, dataId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  return validateMercadoPagoSignature({
    dataId,
    requestId: request.headers.get("x-request-id") || "",
    signature: request.headers.get("x-signature") || "",
    secret: secret || "",
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 50_000) {
    return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
  }
  const body = await request.json().catch(() => null);
  const queryDataId = new URL(request.url).searchParams.get("data.id") || "";
  const bodyDataId = String(body?.data?.id || "");
  if (queryDataId && bodyDataId && queryDataId !== bodyDataId) {
    return NextResponse.json({ error: "Identificador divergente." }, { status: 400 });
  }
  const dataId = queryDataId || bodyDataId;
  if (!validSignature(request, dataId)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }
  if (!String(body?.type || body?.topic || "").includes("payment")) {
    return NextResponse.json({ received: true });
  }
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const secret = createSecretClient();
  if (!accessToken || !secret) {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }
  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!paymentResponse?.ok) {
    return NextResponse.json({ error: "Pagamento não consultado." }, { status: 502 });
  }
  const payment = await paymentResponse.json();
  const expectedLiveMode = mercadoPagoEnvironment() === "production";
  if (payment.live_mode !== expectedLiveMode || payment.currency_id !== "BRL") {
    return NextResponse.json({ error: "Ambiente ou moeda do pagamento inválidos." }, { status: 409 });
  }
  const orderId = String(payment.external_reference || payment.metadata?.order_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const { data: order } = await secret
    .from("orders")
    .select("id, user_id, total, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || Math.abs(Number(order.total) - Number(payment.transaction_amount)) > 0.01) {
    return NextResponse.json({ error: "Valor do pagamento divergente." }, { status: 409 });
  }
  const paymentStatus = normalizePaymentStatus(payment.status);
  if (paymentStatus !== "approved") {
    let update = secret
      .from("orders")
      .update({
        payment_status: paymentStatus,
        payment_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (paymentStatus !== "refunded") update = update.neq("payment_status", "approved");
    await update;
    return NextResponse.json({ received: true });
  }
  const { data: changed, error } = await secret.rpc("confirm_retail_payment", {
    p_order_id: orderId,
    p_payment_reference: dataId,
  });
  if (error) return NextResponse.json({ error: "Pedido não confirmado." }, { status: 409 });

  if (changed) {
    const { data: profile } = await secret
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", order.user_id)
      .maybeSingle();
    if (profile?.email) {
      await sendStoreEmail({
        to: profile.email,
        subject: `Pedido ${orderId.slice(0, 8)} confirmado`,
        title: "Pagamento aprovado",
        intro: `Recebemos seu pagamento, ${profile.full_name}. Seu pedido já está em preparação.`,
        cta: "Acompanhar pedido",
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/conta/pedidos`,
        transactional: true,
      });
    }
  }
  return NextResponse.json({ received: true });
}
