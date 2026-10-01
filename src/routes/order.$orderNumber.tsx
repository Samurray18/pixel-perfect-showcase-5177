import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteShell } from "@/components/site/SiteShell";
import { OrderView } from "@/components/site/OrderView";

export const Route = createFileRoute("/order/$orderNumber")({
  validateSearch: z.object({ email: z.string().catch("") }),
  head: () => ({ meta: [
    { title: "Votre commande — ch7nli" }, { name: "description", content: "Confirmation et code de votre commande." },
    { property: "og:title", content: "Votre commande — ch7nli" }, { property: "og:description", content: "Confirmation de commande." },
    { name: "robots", content: "noindex" },
  ] }),
  component: OrderPage,
});

function OrderPage() {
  const { orderNumber } = Route.useParams();
  const { email } = Route.useSearch();
  return <SiteShell><div className="mx-auto max-w-2xl px-4 py-12"><OrderView orderNumber={orderNumber} email={email} /></div></SiteShell>;
}
