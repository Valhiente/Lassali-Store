import "server-only";

import { createSecretClient } from "@/lib/supabase/server";

export type MercadoPagoCheckoutConfig = {
  environment: "test" | "production";
  flatShipping: number | null;
  enabled: boolean;
  accessToken: string;
  webhookSecret: string;
  updatedAt: string | null;
  source: "admin" | "environment";
};

function environmentFallback(): MercadoPagoCheckoutConfig {
  const rawShipping = process.env.LASSALI_SHIPPING_FLAT_RATE;
  const parsedShipping = rawShipping ? Number(rawShipping.replace(",", ".")) : Number.NaN;
  return {
    environment: process.env.MERCADO_PAGO_ENVIRONMENT === "production" ? "production" : "test",
    flatShipping: Number.isFinite(parsedShipping) && parsedShipping >= 0 ? Math.round(parsedShipping * 100) / 100 : null,
    enabled: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_WEBHOOK_SECRET),
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
    webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || "",
    updatedAt: null,
    source: "environment",
  };
}

export async function getMercadoPagoCheckoutConfig(): Promise<MercadoPagoCheckoutConfig> {
  const fallback = environmentFallback();
  const secret = createSecretClient();
  if (!secret) return fallback;
  const { data, error } = await secret.rpc("get_mercado_pago_checkout_config");
  if (error || !data) return fallback;
  const environment = data.environment === "production" ? "production" : "test";
  const flatShipping = Number(data.flatShipping);
  const accessToken = String(data.accessToken || fallback.accessToken);
  const webhookSecret = String(data.webhookSecret || fallback.webhookSecret);
  return {
    environment,
    flatShipping: Number.isFinite(flatShipping) && flatShipping >= 0 ? flatShipping : fallback.flatShipping,
    enabled: data.enabled === true,
    accessToken,
    webhookSecret,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
    source: "admin",
  };
}

export function checkoutConfigReady(config: MercadoPagoCheckoutConfig) {
  return config.enabled && Boolean(config.accessToken && config.webhookSecret && config.flatShipping !== null);
}
