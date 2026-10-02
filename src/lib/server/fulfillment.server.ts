// Swappable fulfillment providers. Reloadly is used when RELOADLY_CLIENT_ID/SECRET are set,
// otherwise a mock provider returns a fake test code.
import { reloadlyAccessToken, reloadlyBaseUrl, reloadlyConfigured } from "./reloadly.server";

export interface FulfillmentRequest {
  orderNumber: string;
  providerProductId: string | null;
  unitPrice: number | null;
  recipientEmail: string;
  customerName: string;
}
export interface FulfillmentProvider {
  name: string;
  fulfill(req: FulfillmentRequest): Promise<{ code: string; reference?: string }>;
}

export const mockProvider: FulfillmentProvider = {
  name: "mock",
  async fulfill(req) {
    const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return { code: `TEST-${chunk()}-${chunk()}-${chunk()}`, reference: `mock-${req.orderNumber}` };
  },
};

export const reloadlyProvider: FulfillmentProvider = {
  name: "reloadly",
  async fulfill(req) {
    if (!req.providerProductId || !req.unitPrice)
      throw new Error("Denomination missing Reloadly product ID / unit price");
    const audience = reloadlyBaseUrl();
    const headers = {
      Authorization: `Bearer ${await reloadlyAccessToken()}`,
      "Content-Type": "application/json",
      Accept: "application/com.reloadly.giftcards-v1+json",
    };
    const orderRes = await fetch(`${audience}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: Number(req.providerProductId),
        quantity: 1,
        unitPrice: req.unitPrice,
        customIdentifier: req.orderNumber,
        senderName: "ch7nli",
        recipientEmail: req.recipientEmail,
      }),
    });
    if (!orderRes.ok)
      throw new Error(`Reloadly order failed: ${orderRes.status} ${await orderRes.text()}`);
    const order = (await orderRes.json()) as { transactionId: number };
    const cardsRes = await fetch(`${audience}/orders/transactions/${order.transactionId}/cards`, {
      headers,
    });
    if (!cardsRes.ok) throw new Error(`Reloadly cards failed: ${cardsRes.status}`);
    const cards = (await cardsRes.json()) as { cardNumber?: string; pinCode?: string }[];
    const c = cards[0];
    if (!c) throw new Error("Reloadly returned no card");
    const code = [c.cardNumber, c.pinCode].filter(Boolean).join(" / PIN: ");
    return { code, reference: String(order.transactionId) };
  },
};

export function getFulfillmentProvider(): FulfillmentProvider {
  return reloadlyConfigured() ? reloadlyProvider : mockProvider;
}
