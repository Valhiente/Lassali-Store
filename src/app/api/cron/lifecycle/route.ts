import { NextResponse } from "next/server";
import { createSecretClient } from "@/lib/supabase/server";
import { sendLifecycleEmail } from "@/lib/marketing";

function eligibleStage(lastActivity: string, currentStage: number) {
  const hours = (Date.now() - new Date(lastActivity).getTime()) / 3_600_000;
  if (currentStage === 0 && hours >= 1) return 1;
  if (currentStage === 1 && hours >= 24) return 2;
  if (currentStage === 2 && hours >= 72) return 3;
  return null;
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = createSecretClient();
  if (!secret) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  let sent = 0, skipped = 0, failed = 0;

  const { data: carts } = await secret.from("carts").select("id, email, recovery_stage, last_activity_at, session_token").in("status", ["active", "abandoned"]).not("email", "is", null).lt("last_activity_at", new Date(Date.now() - 3_600_000).toISOString()).limit(100);
  for (const cart of carts || []) {
    const stage = eligibleStage(cart.last_activity_at, cart.recovery_stage);
    if (!stage || !cart.email) { skipped++; continue; }
    const [{ data: consent }, { data: suppression }] = await Promise.all([
      secret.from("marketing_consents").select("granted").eq("normalized_contact", cart.email).eq("channel", "email").eq("purpose", "cart_recovery").maybeSingle(),
      secret.from("marketing_suppressions").select("normalized_contact").eq("normalized_contact", cart.email).eq("channel", "email").maybeSingle(),
    ]);
    if (!consent?.granted || suppression) { skipped++; continue; }
    const idempotency = `cart:${cart.id}:stage:${stage}`;
    const { data: existing } = await secret.from("campaign_messages").select("id").eq("idempotency_key", idempotency).maybeSingle();
    if (existing) { skipped++; continue; }
    const templates = {
      1: ["Sua sacola continua salva", "Você deixou alguns itens na sua sacola. Eles continuam disponíveis para você finalizar quando desejar."],
      2: ["Seu look ainda está esperando", "Volte à sua sacola para conferir os produtos, tamanhos e condições de entrega."],
      3: ["Último lembrete da sua sacola", "Este é o último lembrete automático sobre os itens que você selecionou."],
    } as const;
    const [subject, intro] = templates[stage as 1 | 2 | 3];
    const { data: message } = await secret.from("campaign_messages").insert({
      idempotency_key: idempotency,
      cart_id: cart.id,
      channel: "email",
      purpose: "cart_recovery",
      recipient: cart.email,
      template: `cart_stage_${stage}`,
      payload: { stage },
      status: "pending",
      scheduled_for: new Date().toISOString(),
    }).select("id").single();
    if (!message) { skipped++; continue; }
    const result = await sendLifecycleEmail({ to: cart.email, subject, title: subject, intro, cta: "Voltar à sacola", ctaUrl: `${siteUrl}/carrinho` });
    await secret.from("campaign_messages").update({
      status: result.success ? "sent" : "failed",
      provider_message_id: result.success ? result.id : null,
      error_message: result.success ? null : result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    }).eq("id", message?.id);
    if (result.success) {
      sent++;
      await secret.from("carts").update({ recovery_stage: stage, status: "abandoned", updated_at: new Date().toISOString() }).eq("id", cart.id);
      if (stage === 1) await secret.from("commerce_events").insert({ session_token: cart.session_token, event_name: "cart_abandoned", entity_id: cart.id });
    } else failed++;
  }

  const cutoff = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const { data: reorderOrders } = await secret.from("orders").select("id, user_id, created_at, order_items(product_name, category)").eq("status", "delivered").lt("created_at", cutoff).order("created_at", { ascending: false }).limit(100);
  const processedUsers = new Set<string>();
  for (const order of reorderOrders || []) {
    if (processedUsers.has(order.user_id)) continue;
    processedUsers.add(order.user_id);
    const { data: profile } = await secret.from("profiles").select("email, full_name").eq("user_id", order.user_id).maybeSingle();
    if (!profile?.email) continue;
    const [{ data: consent }, { data: suppression }] = await Promise.all([
      secret.from("marketing_consents").select("granted").eq("normalized_contact", profile.email).eq("channel", "email").eq("purpose", "reorder").maybeSingle(),
      secret.from("marketing_suppressions").select("normalized_contact").eq("normalized_contact", profile.email).eq("channel", "email").maybeSingle(),
    ]);
    if (!consent?.granted || suppression) { skipped++; continue; }
    const month = new Date().toISOString().slice(0, 7);
    const idempotency = `reorder:${order.user_id}:${month}`;
    const { data: existing } = await secret.from("campaign_messages").select("id").eq("idempotency_key", idempotency).maybeSingle();
    if (existing) continue;
    const category = order.order_items?.[0]?.category || "fitness";
    const { data: message } = await secret.from("campaign_messages").insert({
      idempotency_key: idempotency, user_id: order.user_id, order_id: order.id, channel: "email", purpose: "reorder",
      recipient: profile.email, template: "customer_reorder", payload: { category }, status: "pending", scheduled_for: new Date().toISOString(),
    }).select("id").single();
    if (!message) { skipped++; continue; }
    const result = await sendLifecycleEmail({
      to: profile.email,
      subject: "Novidades para o seu próximo treino",
      title: `Que tal renovar sua linha ${category}?`,
      intro: "Selecionamos novidades relacionadas às suas compras anteriores. Você decide se é hora de voltar.",
      cta: "Ver novidades",
      ctaUrl: `${siteUrl}/#novidades`,
    });
    await secret.from("campaign_messages").update({ status: result.success ? "sent" : "failed", provider_message_id: result.success ? result.id : null, error_message: result.success ? null : result.error, sent_at: result.success ? new Date().toISOString() : null }).eq("id", message?.id);
    if (result.success) sent++;
    else failed++;
  }
  return NextResponse.json({ success: true, sent, skipped, failed });
}
