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

function canManageStock(adminRole: string | null) {
  return adminRole === "full_admin" || adminRole === "stock";
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

export async function receiveInventory(_state: AdminState, formData: FormData): Promise<AdminState> {
  const actor = await requireAdmin();
  if (!canManageStock(actor.adminRole)) return { error: "Seu perfil não pode movimentar estoque." };
  const variantId = value(formData, "variantId", 50);
  const quantity = Number(value(formData, "quantity", 8));
  const reason = value(formData, "reason", 500) || "Compra recebida pela Forbody";
  if (!/^[0-9a-f-]{36}$/i.test(variantId) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) {
    return { error: "Produto ou quantidade inválida." };
  }
  const secret = createSecretClient();
  if (!secret) return { error: "Serviço de estoque indisponível." };
  const { error } = await secret.rpc("receive_inventory", {
    p_variant_id: variantId,
    p_quantity: quantity,
    p_actor_user_id: actor.userId,
    p_reason: reason,
  });
  if (error) return { error: "Não foi possível registrar a entrada de estoque." };
  revalidatePath("/admin");
  revalidatePath("/forbody");
  revalidatePath("/unidades-forbody");
  return { success: `${quantity} unidade(s) adicionadas ao estoque central.` };
}

export async function updateInventoryPolicy(_state: AdminState, formData: FormData): Promise<AdminState> {
  const actor = await requireAdmin();
  if (!canManageStock(actor.adminRole)) return { error: "Seu perfil não pode configurar estoque." };
  const variantId = value(formData, "variantId", 50);
  const retailSafety = Number(value(formData, "retailSafety", 8));
  const unitSafety = Number(value(formData, "unitSafety", 8));
  const lowStock = Number(value(formData, "lowStock", 8));
  if (!/^[0-9a-f-]{36}$/i.test(variantId) || ![retailSafety, unitSafety, lowStock].every(Number.isInteger) || [retailSafety, unitSafety, lowStock].some((number) => number < 0 || number > 100000)) {
    return { error: "Informe limites válidos." };
  }
  const secret = createSecretClient();
  if (!secret) return { error: "Serviço de estoque indisponível." };
  const { error } = await secret.from("product_variants").update({
    retail_safety_stock: retailSafety,
    unit_safety_stock: unitSafety,
    low_stock_threshold: lowStock,
    updated_at: new Date().toISOString(),
  }).eq("id", variantId);
  if (error) return { error: "Não foi possível atualizar as reservas mínimas." };
  await secret.from("admin_audit_logs").insert({
    actor_user_id: actor.userId,
    action: "inventory.policy_updated",
    details: { variantId, retailSafety, unitSafety, lowStock },
  });
  revalidatePath("/admin");
  return { success: "Política de disponibilidade atualizada." };
}

export async function reviewUnitStockOrder(_state: AdminState, formData: FormData): Promise<AdminState> {
  const actor = await requireAdmin();
  if (!canManageStock(actor.adminRole)) return { error: "Seu perfil não pode liberar pedidos de estoque." };
  const orderId = value(formData, "orderId", 50);
  const decision = value(formData, "decision", 20);
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !["approve", "cancel"].includes(decision)) return { error: "Decisão inválida." };
  const secret = createSecretClient();
  if (!secret) return { error: "Serviço de estoque indisponível." };
  const { data: reservations } = await secret.from("inventory_reservations").select("id").eq("reference_type", "unit_order").eq("reference_id", orderId).eq("status", "active");
  if (!reservations?.length) return { error: "Este pedido não possui reserva ativa." };
  for (const reservation of reservations) {
    const { error } = decision === "approve"
      ? await secret.rpc("commit_inventory_reservation", { p_reservation_id: reservation.id, p_actor_user_id: actor.userId })
      : await secret.rpc("release_inventory_reservation", { p_reservation_id: reservation.id, p_actor_user_id: actor.userId, p_reason: "Pedido da unidade cancelado" });
    if (error) return { error: "Não foi possível concluir a movimentação do estoque." };
  }
  await secret.from("orders").update({
    status: decision === "approve" ? "processing" : "cancelled",
    updated_at: new Date().toISOString(),
  }).eq("id", orderId).eq("channel", "forbody_unit");
  await secret.from("admin_audit_logs").insert({
    actor_user_id: actor.userId,
    action: decision === "approve" ? "inventory.unit_order_approved" : "inventory.unit_order_cancelled",
    details: { orderId },
  });
  revalidatePath("/admin");
  revalidatePath("/unidades-forbody");
  revalidatePath("/forbody");
  return { success: decision === "approve" ? "Pedido aprovado e estoque baixado." : "Pedido cancelado e reserva liberada." };
}
