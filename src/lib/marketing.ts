import "server-only";

import crypto from "node:crypto";

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

export function unsubscribeToken(contact: string, channel: string) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(`${contact}:${channel}`).digest("hex");
}

export function verifyUnsubscribeToken(contact: string, channel: string, token: string) {
  const expected = unsubscribeToken(contact, channel);
  return Boolean(expected && token && expected.length === token.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token)));
}

export async function sendLifecycleEmail({
  to,
  subject,
  title,
  intro,
  cta,
  ctaUrl,
}: {
  to: string;
  subject: string;
  title: string;
  intro: string;
  cta: string;
  ctaUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { success: false, error: "Resend não configurado." };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const token = unsubscribeToken(to, "email");
  const unsubscribeUrl = `${siteUrl}/marketing/unsubscribe?contact=${encodeURIComponent(to)}&channel=email&token=${token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: `<div style="background:#f6f2ec;padding:32px;font-family:Arial,sans-serif;color:#171515">
        <div style="max-width:620px;margin:auto;background:white;padding:34px;border-radius:18px">
          <p style="font-size:11px;letter-spacing:3px;color:#8f2838;font-weight:bold">LASSALI STORE</p>
          <h1 style="font-family:Georgia,serif;font-size:32px">${escapeHtml(title)}</h1>
          <p style="font-size:16px;line-height:1.7;color:#5f5853">${escapeHtml(intro)}</p>
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:18px;background:#171515;color:white;text-decoration:none;padding:15px 22px;font-size:12px;font-weight:bold">${escapeHtml(cta)}</a>
          <p style="margin-top:34px;font-size:11px;color:#8b8580">Você recebeu esta mensagem conforme suas preferências. <a href="${unsubscribeUrl}">Cancelar estes contatos</a>.</p>
        </div>
      </div>`,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { success: false, error: String(data.message || "Falha no envio.") };
  return { success: true, id: String(data.id || "") };
}
