"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";

export async function updatePreferences(formData: FormData) {
  const account = await requireAccount();
  const secret = createSecretClient();
  if (!secret) return;
  const now = new Date().toISOString();
  const rows: Array<[string, string, string, boolean]> = [
    ["email", "cart_recovery", account.email, formData.get("emailCart") === "on"],
    ["email", "offers", account.email, formData.get("emailOffers") === "on"],
    ["email", "reorder", account.email, formData.get("emailReorder") === "on"],
  ];
  if (account.phone) {
    rows.push(
      ["whatsapp", "cart_recovery", account.phone, formData.get("whatsappCart") === "on"],
      ["whatsapp", "offers", account.phone, formData.get("whatsappOffers") === "on"],
    );
  }
  for (const [channel, purpose, contact, granted] of rows) {
    await secret.from("marketing_consents").upsert({
      user_id: account.userId,
      normalized_contact: contact.toLowerCase(),
      channel,
      purpose,
      granted,
      source: "account_preferences",
      policy_version: "2026-07-29",
      granted_at: granted ? now : null,
      revoked_at: granted ? null : now,
      updated_at: now,
    }, { onConflict: "normalized_contact,channel,purpose" });
    if (!granted) await secret.from("marketing_suppressions").upsert({
      normalized_contact: contact.toLowerCase(),
      channel,
      reason: "preference_revoked",
    });
    else await secret.from("marketing_suppressions").delete().eq("normalized_contact", contact.toLowerCase()).eq("channel", channel).eq("reason", "preference_revoked");
  }
  revalidatePath("/conta/preferencias");
}
