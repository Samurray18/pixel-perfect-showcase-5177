// Swappable fulfillment providers. Reloadly is used when RELOADLY_CLIENT_ID/SECRET are set,
// otherwise a mock provider returns a fake test code.
export interface FulfillmentRequest {
  orderNumber: string; providerProductId: string | null; unitPrice: number | null; recipientEmail: string; customerName: string;
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
    if (!req.providerProductId || !req.unitPrice) throw new Error("Denomination missing Reloadly product ID / unit price");
    const sandbox = process.env["RELOADLY_SANDBOX"] !== "false";
    const audience = sandbox ? "https://giftcards-sandbox.reloadly.com" : "https://giftcards.reloadly.com";
    const tokRes = await fetch("https://auth.reloadly.com/oauth/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env["RELOADLY_CLIENT_ID"], client_secret: process.env["RELOADLY_CLIENT_SECRET"],
        grant_type: "client_credentials", audience,
      }),
    });
    if (!tokRes.ok) throw new Error(`Reloadly auth failed: ${tokRes.status}`);
    const { access_token } = (await tokRes.json()) as { access_token: string };
    const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json", Accept: "application/com.reloadly.giftcards-v1+json" };
    const orderRes = await fetch(`${audience}/orders`, {
      method: "POST", headers,
      body: JSON.stringify({
        productId: Number(req.providerProductId), quantity: 1, unitPrice: req.unitPrice,
        customIdentifier: req.orderNumber, senderName: "ch7nli", recipientEmail: req.recipientEmail,
      }),
    });
    if (!orderRes.ok) throw new Error(`Reloadly order failed: ${orderRes.status} ${await orderRes.text()}`);
    const order = (await orderRes.json()) as { transactionId: number };
    const cardsRes = await fetch(`${audience}/orders/transactions/${order.transactionId}/cards`, { headers });
    if (!cardsRes.ok) throw new Error(`Reloadly cards failed: ${cardsRes.status}`);
    const cards = (await cardsRes.json()) as { cardNumber?: string; pinCode?: string }[];
    const c = cards[0];
    if (!c) throw new Error("Reloadly returned no card");
    const code = [c.cardNumber, c.pinCode].filter(Boolean).join(" / PIN: ");
    return { code, reference: String(order.transactionId) };
  },
};

export function getFulfillmentProvider(): FulfillmentProvider {
  return process.env["RELOADLY_CLIENT_ID"] && process.env["RELOADLY_CLIENT_SECRET"] ? reloadlyProvider : mockProvider;
}
