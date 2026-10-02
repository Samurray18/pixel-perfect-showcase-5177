import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/server/admin.server";

const CreateOrder = z.object({
  denominationId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s]{9,15}$/),
  method: z.enum(["edahabia", "cib"]),
  locale: z.enum(["fr", "ar"]),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateOrder.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { chargilyConfigured, createChargilyCheckout } = await import("./server/payments.server");
    const { data: denom } = await supabaseAdmin
      .from("denominations")
      .select("id,label,price_dzd,in_stock,products(id,name,in_stock)")
      .eq("id", data.denominationId)
      .single();
    const product = denom?.products as unknown as {
      id: string;
      name: string;
      in_stock: boolean;
    } | null;
    if (!denom || !product || !denom.in_stock || !product.in_stock)
      throw new Error("Produit indisponible");

    const orderNumber = `C7-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        product_id: product.id,
        denomination_id: denom.id,
        product_name: product.name,
        denomination_label: denom.label,
        amount_dzd: denom.price_dzd,
        payment_method: data.method,
      })
      .select("id")
      .single();
    if (error || !order) throw new Error("Impossible de créer la commande");

    const origin = new URL(getRequest().url).origin;
    const back = `${origin}/order/${orderNumber}?email=${encodeURIComponent(data.email.toLowerCase())}`;
    if (!chargilyConfigured())
      return { orderNumber, email: data.email.toLowerCase(), redirectUrl: null as string | null };

    const checkout = await createChargilyCheckout({
      amount: denom.price_dzd,
      method: data.method,
      orderNumber,
      successUrl: back,
      failureUrl: back,
      webhookUrl: `${origin}/api/public/chargily-webhook`,
      locale: data.locale,
    });
    await supabaseAdmin.from("orders").update({ checkout_id: checkout.id }).eq("id", order.id);
    return {
      orderNumber,
      email: data.email.toLowerCase(),
      redirectUrl: checkout.checkout_url as string | null,
    };
  });

const Lookup = z.object({
  orderNumber: z.string().trim().min(3).max(60),
  email: z.string().trim().email().max(255),
});

export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => Lookup.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptCode } = await import("./server/crypto.server");
    const { chargilyConfigured } = await import("./server/payments.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_number", data.orderNumber.toUpperCase())
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (!o) return null;
    return {
      orderNumber: o.order_number,
      product: o.product_name,
      denomination: o.denomination_label,
      amount: o.amount_dzd,
      paymentStatus: o.payment_status,
      fulfillmentStatus: o.fulfillment_status,
      createdAt: o.created_at,
      code: o.code_encrypted ? await decryptCode(o.code_encrypted) : null,
      testMode: !chargilyConfigured(),
    };
  });

// Only available when Chargily is NOT configured — lets you test the full flow.
export const simulatePayment = createServerFn({ method: "POST" })
  .inputValidator((d) => Lookup.parse(d))
  .handler(async ({ data }) => {
    const { chargilyConfigured } = await import("./server/payments.server");
    if (chargilyConfigured()) throw new Error("Disabled when live payments are configured");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("order_number")
      .eq("order_number", data.orderNumber)
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (!o) throw new Error("Not found");
    const { markPaidAndFulfill } = await import("./server/orders.server");
    await markPaidAndFulfill(o.order_number);
    return { ok: true };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { granted: false };
    await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    return { granted: true };
  });

export const adminFulfill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ orderId: z.string().uuid(), code: z.string().trim().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { deliverCode, fulfillOrder } = await import("./server/orders.server");
    if (data.code) await deliverCode(data.orderId, data.code);
    else await fulfillOrder(data.orderId);
    return { ok: true };
  });

export const adminRevealCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptCode } = await import("./server/crypto.server");
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("code_encrypted")
      .eq("id", data.orderId)
      .single();
    return { code: o?.code_encrypted ? await decryptCode(o.code_encrypted) : null };
  });
