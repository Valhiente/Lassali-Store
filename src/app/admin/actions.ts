"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";
import { validCnpj } from "@/lib/validation";

export type AdminState = { error?: string; success?: string };

const allowedRoles = ["full_admin", "commercial", "stock", "marketing", "finance", "support", "viewer"];

function value(formData: FormData, key: string, limit = 160) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, limit) : "";
}

function canManage(adminRole: string | null) {
  return adminRole === "full_admin" || adminRole === "commercial";
}

export async function reviewOrganization(_state: AdminState, formData: FormData): Promise<AdminState> {
  const actor = await requireAdmin();
  if (!canManage(actor.adminRole)) return { error: "Seu perfil não gerencia cadastros." };
  const organizationId = value(formData, "organizationId", 50);
  const decision = value(formData, "decision", 20);
  if (!organizationId || !["approved", "rejected"].includes(decision)) return { error: "Decisão inválida." };
  const secret = createSecretClient();
  if (!secret) return { error: "Serviço administrativo indisponível." };
  const status = decision === "approved" ? "active" : "rejected";
  const { data: members } = await secret.from("organization_members").select("user_id").eq("organization_id", organizationId);
  const now = new Date().toISOString();
  const { error } = await secret.from("organizations").update({
    status,
    reviewed_by: actor.userId,
    reviewed_at: now,
    rejection_reason: status === "rejected" ? value(formData, "reason", 500) || "Cadastro não aprovado." : null,
    updated_at: now,
  }).eq("id", organizationId);
  if (error) return { error: "Não foi possível revisar a empresa." };
  for (const member of members || []) {
    await secret.from("account_access").update({
      status,
      approved_by: actor.userId,
      approved_at: status === "active" ? now : null,
      updated_at: now,
    }).eq("user_id", member.user_id);
    await secret.from("organization_members").update({ status }).eq("organization_id", organizationId).eq("user_id", member.user_id);
  }
  await secret.from("admin_audit_logs").insert({
    actor_user_id: actor.userId,
    organization_id: organizationId,
    action: `organization.${status}`,
    details: { reason: value(formData, "reason", 500) || null },
  });
  revalidatePath("/admin");
  return { success: status === "active" ? "Cadastro aprovado." : "Cadastro rejeitado." };
}

export async function updateAccountAccess(_state: AdminState, formData: FormData): Promise<AdminState> {
  const actor = await requireAdmin();
  if (actor.adminRole !== "full_admin") return { error: "Somente o administrador geral pode alterar acessos." };
  const userId = value(formData, "userId", 50);
  const status = value(formData, "status", 20);
  const role = value(formData, "adminRole", 30) || null;
  if (!userId || !["active", "pending", "blocked", "rejected"].includes(status)) return { error: "Acesso inválido." };
  if (actor.userId === userId && status !== "active") return { error: "Você não pode bloquear a própria conta." };
  if (role && !allowedRoles.includes(role)) return { error: "Perfil inválido." };
  const secret = createSecretClient();
  if (!secret) return { error: "Serviço administrativo indisponível." };
  const { data: target } = await secret.from("account_access").select("kind").eq("user_id", userId).maybeSingle();
  const { error } = await secret.from("account_access").update({
    status,
    ...(target?.kind === "admin" ? { admin_role: role } : {}),
    blocked_reason: status === "blocked" ? value(formData, "reason", 500) || "Bloqueado pelo administrador." : null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (error) return { error: "Não foi possível alterar o acesso." };
  await secret.from("admin_audit_logs").insert({
    actor_user_id: actor.userId,
    target_user_id: userId,
    action: "account.access_updated",
    details: { status, role },
  });
  revalidatePath("/admin");
  return { success: "Acesso atualizado." };
}

export async function inviteForbodyUnit(_state: AdminState, formData: FormData): Promise<AdminState> {
  const actor = await requireAdmin();
  if (!canManage(actor.adminRole)) return { error: "Seu perfil não pode convidar unidades." };
  const email = value(formData, "email").toLowerCase();
  const fullName = value(formData, "fullName");
  const legalName = value(formData, "legalName");
  const tradeName = value(formData, "tradeName");
  const cnpj = value(formData, "cnpj", 30).replace(/\D/g, "");
  const slug = value(formData, "unitSlug", 80).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const phone = value(formData, "phone", 30).replace(/\D/g, "");
  const city = value(formData, "city");
  const state = value(formData, "state", 2).toUpperCase();
  if (!email || !fullName || !legalName || !tradeName || !validCnpj(cnpj) || !slug || phone.length < 10 || !city || state.length !== 2) {
    return { error: "Preencha todos os dados obrigatórios da unidade." };
  }
  const secret = createSecretClient();
  if (!secret) return { error: "Serviço administrativo indisponível." };
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error: inviteError } = await secret.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/conta/aceitar-convite`,
    data: { invited_to: "Lassali Forbody Unit" },
  });
  if (inviteError || !data.user) return { error: "Não foi possível enviar o convite. Verifique se o e-mail já possui conta." };
  const { data: organization, error: organizationError } = await secret.from("organizations").insert({
    kind: "forbody_unit",
    legal_name: legalName,
    trade_name: tradeName,
    cnpj,
    contact_name: fullName,
    contact_email: email,
    contact_phone: phone,
    city,
    state,
    forbody_unit_slug: slug,
    status: "active",
    reviewed_by: actor.userId,
    reviewed_at: new Date().toISOString(),
  }).select("id").single();
  if (organizationError || !organization) {
    await secret.auth.admin.deleteUser(data.user.id);
    return { error: "A unidade não pôde ser registrada; nenhum acesso foi mantido." };
  }
  await secret.from("profiles").upsert({ user_id: data.user.id, full_name: fullName, email, phone });
  await secret.from("account_access").upsert({ user_id: data.user.id, kind: "forbody_unit", status: "pending" });
  await secret.from("organization_members").insert({
    organization_id: organization.id,
    user_id: data.user.id,
    role: "manager",
    status: "pending",
    invited_at: new Date().toISOString(),
  });
  await secret.from("admin_audit_logs").insert({
    actor_user_id: actor.userId,
    target_user_id: data.user.id,
    organization_id: organization.id,
    action: "forbody_unit.invited",
    details: { email, slug },
  });
  revalidatePath("/admin");
  return { success: "Unidade criada e convite enviado." };
}
