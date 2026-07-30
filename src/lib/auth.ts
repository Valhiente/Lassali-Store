import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, createSecretClient } from "@/lib/supabase/server";

export type AccountKind = "retail" | "wholesale" | "forbody_unit" | "admin";
export type AccessStatus = "pending" | "active" | "blocked" | "rejected";

export type AccountContext = {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  kind: AccountKind;
  status: AccessStatus;
  adminRole: string | null;
  organizationId: string | null;
  organizationName: string | null;
};

export const getAccountContext = cache(async (): Promise<AccountContext | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") return null;

  const secret = createSecretClient();
  if (!secret) return null;
  const [{ data: profile }, { data: access }, { data: membership }] = await Promise.all([
    secret.from("profiles").select("full_name, email, phone").eq("user_id", userId).maybeSingle(),
    secret.from("account_access").select("kind, status, admin_role").eq("user_id", userId).maybeSingle(),
    secret.from("organization_members").select("organization_id, organizations(trade_name, legal_name)").eq("user_id", userId).eq("status", "active").maybeSingle(),
  ]);
  if (!profile || !access) return null;
  const organization = Array.isArray(membership?.organizations)
    ? membership.organizations[0]
    : membership?.organizations;
  return {
    userId,
    email: profile.email,
    fullName: profile.full_name,
    phone: profile.phone,
    kind: access.kind as AccountKind,
    status: access.status as AccessStatus,
    adminRole: access.admin_role,
    organizationId: membership?.organization_id ?? null,
    organizationName: organization?.trade_name || organization?.legal_name || null,
  };
});

export async function requireAccount() {
  const account = await getAccountContext();
  if (!account) redirect("/conta/entrar");
  if (account.status === "blocked") redirect("/conta/bloqueada");
  return account;
}

export async function requireAdmin() {
  const account = await requireAccount();
  if (account.kind !== "admin" || account.status !== "active") redirect("/conta");
  return account;
}

export async function requireForbodyUnit() {
  const account = await requireAccount();
  if (account.kind !== "forbody_unit" || account.status !== "active" || !account.organizationId) {
    redirect("/conta");
  }
  return account;
}
