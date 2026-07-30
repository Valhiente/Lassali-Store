import { NextResponse } from "next/server";
import { createSecretClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = createSecretClient();
  if (!secret) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { count } = await secret.from("account_access").select("user_id", { head: true, count: "exact" }).eq("kind", "admin").eq("admin_role", "full_admin");
  if ((count || 0) > 0) return NextResponse.json({ error: "Bootstrap already completed" }, { status: 409 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 3) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const { data, error } = await secret.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/conta/aceitar-convite-admin`,
    data: { invited_to: "Lassali Admin" },
  });
  if (error || !data.user) return NextResponse.json({ error: "Invite failed" }, { status: 400 });
  await secret.from("profiles").insert({ user_id: data.user.id, full_name: fullName, email });
  await secret.from("account_access").insert({ user_id: data.user.id, kind: "admin", status: "active", admin_role: "full_admin", approved_at: new Date().toISOString() });
  return NextResponse.json({ success: true });
}
