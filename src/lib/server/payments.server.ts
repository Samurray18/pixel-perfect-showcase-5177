// Chargily Pay v2 integration. Set CHARGILY_SECRET_KEY (test_sk_... or live_sk_...).
import { createHmac, timingSafeEqual } from "crypto";

export const chargilyConfigured = () => !!process.env["CHARGILY_SECRET_KEY"];

function baseUrl() {
  const key = process.env["CHARGILY_SECRET_KEY"] ?? "";
  return key.startsWith("live_") ? "https://pay.chargily.net/api/v2" : "https://pay.chargily.net/test/api/v2";
}

export async function createChargilyCheckout(input: {
  amount: number; method: "edahabia" | "cib"; orderNumber: string; successUrl: string; failureUrl: string; webhookUrl: string; locale: "ar" | "fr";
}) {
  const res = await fetch(`${baseUrl()}/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env["CHARGILY_SECRET_KEY"]}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amount, currency: "dzd", payment_method: input.method,
      success_url: input.successUrl, failure_url: input.failureUrl, webhook_endpoint: input.webhookUrl,
      locale: input.locale, metadata: { order_number: input.orderNumber },
    }),
  });
  if (!res.ok) throw new Error(`Chargily error ${res.status}: ${await res.text()}`);
  return (await res.json()) as { id: string; checkout_url: string };
}

export function verifyChargilySignature(rawBody: string, signature: string | null) {
  const key = process.env["CHARGILY_SECRET_KEY"];
  if (!key || !signature) return false;
  const expected = createHmac("sha256", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
