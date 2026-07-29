import { NextResponse } from "next/server";
import { createSecretClient } from "@/lib/supabase/server";
import { verifyUnsubscribeToken } from "@/lib/marketing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const contact = (url.searchParams.get("contact") || "").trim().toLowerCase();
  const channel = url.searchParams.get("channel") || "email";
  const token = url.searchParams.get("token") || "";
  if (!verifyUnsubscribeToken(contact, channel, token)) return new Response("Link inválido.", { status: 400 });
  const secret = createSecretClient();
  if (!secret) return new Response("Serviço indisponível.", { status: 503 });
  const now = new Date().toISOString();
  await secret.from("marketing_suppressions").upsert({
    normalized_contact: contact,
    channel,
    reason: "user_unsubscribed",
    created_at: now,
  });
  await secret.from("marketing_consents").update({ granted: false, revoked_at: now, updated_at: now }).eq("normalized_contact", contact).eq("channel", channel);
  return NextResponse.redirect(new URL("/conta/preferencias?cancelado=1", url.origin));
}
