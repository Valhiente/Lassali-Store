"use server";

import { createClient, createSecretClient } from "@/lib/supabase/server";

export async function completeUnitInvite() {
  const supabase = await createClient();
  const { data, error } = supabase ? await supabase.auth.getClaims() : { data: null, error: new Error() };
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") return { error: "Convite inválido ou expirado." };
  const secret = createSecretClient();
  if (!secret) return { error: "Serviço administrativo indisponível." };
  const { data: access } = await secret.from("account_access").select("kind, status").eq("user_id", userId).maybeSingle();
  if (access?.kind !== "forbody_unit" || access.status !== "pending") return { error: "Este convite não pertence a uma unidade pendente." };
  const now = new Date().toISOString();
  await secret.from("account_access").update({ status: "active", approved_at: now, updated_at: now }).eq("user_id", userId);
  await secret.from("organization_members").update({ status: "active", accepted_at: now }).eq("user_id", userId);
  return { success: true };
}
