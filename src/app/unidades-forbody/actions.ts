"use server";

import { revalidatePath } from "next/cache";
import { requireForbodyUnit } from "@/lib/auth";
import { createSecretClient } from "@/lib/supabase/server";

export type UnitOrderState = { error?: string; success?: string };

export async function createUnitStockRequest(_state: UnitOrderState, formData: FormData): Promise<UnitOrderState> {
  const account = await requireForbodyUnit();
  const rawVariant = formData.get("variantId");
  const rawQuantity = formData.get("quantity");
  const variantId = typeof rawVariant === "string" ? rawVariant : "";
  const quantity = typeof rawQuantity === "string" ? Number(rawQuantity) : 0;
  if (!/^[0-9a-f-]{36}$/i.test(variantId) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
    return { error: "Selecione um produto e informe uma quantidade válida." };
  }
  const secret = createSecretClient();
  if (!secret || !account.organizationId) return { error: "Serviço de pedidos indisponível." };
  const { data: orderId, error } = await secret.rpc("create_unit_stock_request", {
    p_user_id: account.userId,
    p_organization_id: account.organizationId,
    p_variant_id: variantId,
    p_quantity: quantity,
  });
  if (error) {
    return { error: error.message.includes("Estoque insuficiente") ? "Quantidade indisponível para a unidade." : "Não foi possível criar o pedido." };
  }
  revalidatePath("/unidades-forbody");
  revalidatePath("/admin");
  revalidatePath("/forbody");
  return { success: `Pedido ${String(orderId).slice(0, 8)} criado e estoque reservado por 7 dias.` };
}
