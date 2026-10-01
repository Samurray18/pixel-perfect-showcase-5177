import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/chargily-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyChargilySignature } = await import("@/lib/server/payments.server");
        const raw = await request.text();
        if (!verifyChargilySignature(raw, request.headers.get("signature"))) {
          return new Response("Invalid signature", { status: 401 });
        }
        const event = JSON.parse(raw) as { type: string; data?: { metadata?: { order_number?: string } } };
        const orderNumber = event.data?.metadata?.order_number;
        if (!orderNumber) return new Response("ok");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (event.type === "checkout.paid") {
          const { markPaidAndFulfill } = await import("@/lib/server/orders.server");
          await markPaidAndFulfill(orderNumber);
        } else if (event.type === "checkout.failed" || event.type === "checkout.canceled") {
          await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("order_number", orderNumber);
        }
        return new Response("ok");
      },
    },
  },
});
