import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { encryptCode } from "./crypto.server";
import { getFulfillmentProvider } from "./fulfillment.server";
import { sendCodeEmail } from "./email.server";

export async function markPaidAndFulfill(orderNumber: string) {
  const { data: order } = await supabaseAdmin.from("orders").select("*").eq("order_number", orderNumber).maybeSingle();
  if (!order) throw new Error("Order not found");
  if (order.payment_status !== "paid") {
    await supabaseAdmin.from("orders").update({ payment_status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
  }
  if (order.fulfillment_status === "fulfilled") return;
  await fulfillOrder(order.id);
}

export async function fulfillOrder(orderId: string) {
  const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
  if (!order) return;
  const { data: denom } = order.denomination_id
    ? await supabaseAdmin.from("denominations").select("provider_product_id,provider_unit_price").eq("id", order.denomination_id).maybeSingle()
    : { data: null };
  try {
    const provider = getFulfillmentProvider();
    const { code } = await provider.fulfill({
      orderNumber: order.order_number, providerProductId: denom?.provider_product_id ?? null,
      unitPrice: denom?.provider_unit_price ? Number(denom.provider_unit_price) : null,
      recipientEmail: order.email, customerName: order.customer_name,
    });
    await deliverCode(order.id, code);
  } catch (e) {
    console.error("fulfillment failed", e);
    await supabaseAdmin.from("orders").update({ fulfillment_status: "failed", fulfillment_error: String((e as Error).message) }).eq("id", order.id);
  }
}

export async function deliverCode(orderId: string, code: string) {
  const { data: order } = await supabaseAdmin.from("orders")
    .update({ code_encrypted: await encryptCode(code), fulfillment_status: "fulfilled", fulfilled_at: new Date().toISOString(), fulfillment_error: null })
    .eq("id", orderId).select("*").single();
  if (order) await sendCodeEmail(order.email, { orderNumber: order.order_number, product: order.product_name, denomination: order.denomination_label, code });
}
