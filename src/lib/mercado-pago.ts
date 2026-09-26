import crypto from "node:crypto";

export type MercadoPagoEnvironment = "test" | "production";

export function mercadoPagoEnvironment(): MercadoPagoEnvironment {
  return process.env.MERCADO_PAGO_ENVIRONMENT === "production" ? "production" : "test";
}

export function configuredShippingRate() {
  const raw = process.env.LASSALI_SHIPPING_FLAT_RATE;
  if (raw === undefined || raw.trim() === "") return null;
  const amount = Number(raw.replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
}

export function validateMercadoPagoSignature({
  dataId,
  requestId,
  signature,
  secret,
  now = Date.now(),
}: {
  dataId: string;
  requestId: string;
  signature: string;
  secret: string;
  now?: number;
}) {
  const parts = Object.fromEntries(
    signature.split(",").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 1) return [];
      return [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]];
    }),
  );
  const timestamp = parts.ts;
  const receivedHash = parts.v1;
  if (!timestamp || !receivedHash || !requestId || !dataId || !secret) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  const timestampMs = timestampNumber > 10_000_000_000 ? timestampNumber : timestampNumber * 1000;
  if (Math.abs(now - timestampMs) > 5 * 60_000) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return expectedHash.length === receivedHash.length &&
    crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash));
}

export function normalizePaymentStatus(status: unknown) {
  if (status === "approved") return "approved" as const;
  if (status === "rejected") return "rejected" as const;
  if (status === "cancelled") return "cancelled" as const;
  if (status === "refunded" || status === "charged_back") return "refunded" as const;
  return "pending" as const;
}
