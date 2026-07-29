import { NextResponse } from "next/server";
import { createClient, createSecretClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.sessionToken === "string" ? body.sessionToken : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const emailConsent = body?.emailConsent === true;
  const whatsapp = typeof body?.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "").slice(0, 13) : "";
  const whatsappConsent = body?.whatsappConsent === true;
  if (!/^[0-9a-f-]{36}$/i.test(token) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const secret = createSecretClient();
  if (!secret) return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  const supabase = await createClient();
  const { data: claims } = supabase ? await supabase.auth.getClaims() : { data: null };
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  await secret.from("carts").update({ email, user_id: userId, updated_at: new Date().toISOString() }).eq("session_token", token);
  const now = new Date().toISOString();
  const consents = [
    {
      user_id: userId,
      normalized_contact: email,
      channel: "email",
      purpose: "cart_recovery",
      granted: emailConsent,
      source: "cart",
      policy_version: "2026-07-29",
      granted_at: emailConsent ? now : null,
      revoked_at: emailConsent ? null : now,
      updated_at: now,
    },
  ];
  if (whatsapp.length >= 10) consents.push({
    user_id: userId,
    normalized_contact: whatsapp,
    channel: "whatsapp",
    purpose: "cart_recovery",
    granted: whatsappConsent,
    source: "cart",
    policy_version: "2026-07-29",
    granted_at: whatsappConsent ? now : null,
    revoked_at: whatsappConsent ? null : now,
    updated_at: now,
  });
  await secret.from("marketing_consents").upsert(consents, { onConflict: "normalized_contact,channel,purpose" });
  return NextResponse.json({ success: true });
}
