import { NextResponse } from "next/server";
import { createSecretClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const secret = createSecretClient();
  const { error } = secret
    ? await secret.from("products").select("id", { head: true, count: "exact" }).limit(1)
    : { error: new Error("Supabase não configurado") };
  const checks = {
    database: !error,
    canonicalUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")),
    payments: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_WEBHOOK_SECRET),
    transactionalEmail: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    lifecycleCron: Boolean(process.env.CRON_SECRET),
    unsubscribeSigning: Boolean(process.env.UNSUBSCRIBE_SECRET),
  };
  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    { status: ready ? "ready" : "degraded", checks },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
