"use server";

import { redirect } from "next/navigation";
import { createClient, createSecretClient } from "@/lib/supabase/server";
import { validCnpj, validPassword } from "@/lib/validation";

export type AuthState = { error?: string; success?: string };

function text(formData: FormData, key: string, limit = 160) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 13);
}

async function createBaseUser(formData: FormData) {
  const fullName = text(formData, "fullName");
  const email = normalizeEmail(text(formData, "email"));
  const phone = normalizePhone(text(formData, "phone"));
  const password = text(formData, "password", 200);
  const confirmPassword = text(formData, "confirmPassword", 200);
  if (fullName.split(/\s+/).length < 2) return { error: "Informe nome e sobrenome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (phone.length < 10) return { error: "Informe um telefone válido." };
  if (!validPassword(password)) return { error: "A senha precisa ter 12 caracteres, letra, número e símbolo." };
  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

  const supabase = await createClient();
  if (!supabase) return { error: "Cadastro temporariamente indisponível." };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      data: { full_name: fullName },
    },
  });
  if (error || !data.user) {
    return { error: error?.message.toLowerCase().includes("registered") ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta." };
  }
  return { userId: data.user.id, fullName, email, phone };
}

export async function registerRetail(_state: AuthState, formData: FormData): Promise<AuthState> {
  const created = await createBaseUser(formData);
  if ("error" in created) return created;
  const secret = createSecretClient();
  if (!secret) return { error: "Configuração administrativa indisponível." };
  const now = new Date().toISOString();
  const { error } = await secret.from("profiles").upsert({
    user_id: created.userId,
    full_name: created.fullName,
    email: created.email,
    phone: created.phone,
    updated_at: now,
  });
  if (error) {
    await secret.auth.admin.deleteUser(created.userId);
    return { error: "Não foi possível concluir o cadastro." };
  }
  const { error: accessError } = await secret.from("account_access").upsert({
    user_id: created.userId,
    kind: "retail",
    status: "active",
    updated_at: now,
  });
  if (accessError) {
    await secret.auth.admin.deleteUser(created.userId);
    return { error: "Não foi possível concluir o cadastro." };
  }
  await secret.from("commerce_events").insert({
    user_id: created.userId,
    event_name: "account_created",
    properties: { kind: "retail" },
  });
  return { success: "Conta criada. Confirme seu e-mail para entrar." };
}

export async function registerWholesale(_state: AuthState, formData: FormData): Promise<AuthState> {
  const cnpjRaw = text(formData, "cnpj", 30);
  if (!validCnpj(cnpjRaw)) return { error: "Informe um CNPJ válido." };
  const cnpj = cnpjRaw.replace(/\D/g, "");
  const legalName = text(formData, "legalName");
  const tradeName = text(formData, "tradeName");
  const city = text(formData, "city");
  const state = text(formData, "state", 2).toUpperCase();
  if (!legalName || !tradeName || !city || state.length !== 2) return { error: "Preencha os dados obrigatórios da empresa." };

  const secret = createSecretClient();
  if (!secret) return { error: "Configuração administrativa indisponível." };
  const { data: existing } = await secret.from("organizations").select("id").eq("cnpj", cnpj).maybeSingle();
  if (existing) return { error: "Este CNPJ já possui cadastro." };
  const created = await createBaseUser(formData);
  if ("error" in created) return created;
  const now = new Date().toISOString();
  const { error: profileError } = await secret.from("profiles").upsert({
    user_id: created.userId,
    full_name: created.fullName,
    email: created.email,
    phone: created.phone,
    updated_at: now,
  });
  const { error: accessError } = await secret.from("account_access").upsert({
    user_id: created.userId,
    kind: "wholesale",
    status: "pending",
    updated_at: now,
  });
  if (profileError || accessError) {
    await secret.auth.admin.deleteUser(created.userId);
    return { error: "Não foi possível concluir o cadastro empresarial." };
  }
  const { data: organization, error } = await secret.from("organizations").insert({
    kind: "wholesale",
    legal_name: legalName,
    trade_name: tradeName,
    cnpj,
    state_registration: text(formData, "stateRegistration"),
    contact_name: created.fullName,
    contact_email: created.email,
    contact_phone: created.phone,
    city,
    state,
    social_profile: text(formData, "socialProfile"),
    expected_monthly_volume: text(formData, "expectedMonthlyVolume"),
    status: "pending",
  }).select("id").single();
  if (error || !organization) {
    await secret.auth.admin.deleteUser(created.userId);
    return { error: "Não foi possível registrar a empresa." };
  }
  const { error: memberError } = await secret.from("organization_members").insert({
    organization_id: organization.id,
    user_id: created.userId,
    role: "manager",
    status: "pending",
  });
  if (memberError) {
    await secret.from("organizations").delete().eq("id", organization.id);
    await secret.auth.admin.deleteUser(created.userId);
    return { error: "Não foi possível concluir o vínculo com a empresa." };
  }
  await secret.from("commerce_events").insert({
    user_id: created.userId,
    event_name: "wholesale_applied",
    entity_id: organization.id,
    properties: { cnpj },
  });
  return { success: "Cadastro recebido. Confirme seu e-mail; o atacado será liberado após análise do CNPJ." };
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password", 200);
  const supabase = await createClient();
  if (!supabase) return { error: "Login temporariamente indisponível." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "E-mail ou senha incorretos." };
  const secret = createSecretClient();
  const { data: access } = secret
    ? await secret.from("account_access").select("kind, status").eq("user_id", data.user.id).maybeSingle()
    : { data: null };
  if (!access || access.status === "blocked") {
    await supabase.auth.signOut();
    return { error: access?.status === "blocked" ? "Esta conta está bloqueada." : "Perfil de acesso não encontrado." };
  }
  if (access.kind === "admin") redirect("/admin");
  if (access.kind === "forbody_unit" && access.status === "active") redirect("/unidades-forbody");
  redirect("/conta");
}

export async function logout() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(text(formData, "email"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  const supabase = await createClient();
  if (!supabase) return { error: "Recuperação temporariamente indisponível." };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/conta/redefinir-senha`,
  });
  return { success: "Se o e-mail estiver cadastrado, enviaremos o link de recuperação." };
}
