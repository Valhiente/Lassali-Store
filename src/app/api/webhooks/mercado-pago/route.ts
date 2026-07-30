import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSecretClient } from "@/lib/supabase/server";
import { sendStoreEmail } from "@/lib/marketing";

function validSignature(request: Request, dataId: string) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const signature = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    }),
  );
  if (!secret || !parts.ts || !parts.v1 || !requestId || !dataId) return false;
  const timestamp = Number(parts.ts);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp * 1000) > 5 * 60_000) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return expected.length === parts.v1.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const dataId = String(body?.data?.id || new URL(request.url).searchParams.get("data.id") || "");
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
  if (payment.status !== "approved") {
    await secret
      .from("orders")
      .update({
        payment_status: payment.status === "rejected" ? "rejected" : "pending",
        payment_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .neq("payment_status", "approved");
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
