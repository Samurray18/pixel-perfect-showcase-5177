import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { productsQuery } from "@/lib/catalog";
import { formatDZD, useI18n } from "@/lib/i18n";
import { createOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/checkout")({
  validateSearch: z.object({ d: z.string().catch("") }),
  head: () => ({ meta: [
    { title: "Paiement — ch7nli" }, { name: "description", content: "Finalisez votre achat par Edahabia ou CIB." },
    { property: "og:title", content: "Paiement — ch7nli" }, { property: "og:description", content: "Paiement sécurisé Edahabia & CIB." },
    { name: "robots", content: "noindex" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Checkout,
});

function Checkout() {
  const { d } = Route.useSearch();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const create = useServerFn(createOrder);
  const { data } = useSuspenseQuery(productsQuery);
  const product = data.find((p) => p.denominations.some((x) => x.id === d));
  const denom = product?.denominations.find((x) => x.id === d);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [method, setMethod] = useState<"edahabia" | "cib">("edahabia");
  const [busy, setBusy] = useState(false);

  if (!product || !denom) return <SiteShell><div className="p-16 text-center"><Link to="/products" className="text-primary underline">{t("catalog")}</Link></div></SiteShell>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await create({ data: { denominationId: denom.id, ...form, method, locale: lang } });
      if (r.redirectUrl) window.location.href = r.redirectUrl;
      else nav({ to: "/order/$orderNumber", params: { orderNumber: r.orderNumber }, search: { email: r.email } });
    } catch (err) {
      toast.error((err as Error).message.includes("phone") ? "Numéro invalide" : "Vérifiez vos informations");
      setBusy(false);
    }
  };
  const input = "w-full rounded-xl border bg-input/30 px-4 py-3 outline-none focus:border-primary";

  return (
    <SiteShell>
      <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <h1 className="text-4xl font-black">{t("checkout")}</h1>
          <div className="space-y-3">
            <input required placeholder={t("fullName")} className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required type="email" placeholder={t("email")} className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required type="tel" placeholder="05 XX XX XX XX" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("payMethod")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {([["edahabia", "Edahabia", "Algérie Poste"], ["cib", "CIB", "Carte interbancaire"]] as const).map(([v, l, s]) => (
                <button type="button" key={v} onClick={() => setMethod(v)}
                  className={`rounded-xl border-2 p-4 text-start ${method === v ? "border-primary bg-primary/10 glow" : "bg-card"}`}>
                  <div className="font-display text-lg font-bold">{l}</div><div className="text-xs text-muted-foreground">{s}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="h-fit rounded-2xl border bg-card p-6 md:sticky md:top-24">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("summary")}</h2>
          <div className="mt-4 font-display text-xl font-bold">{product.name}</div>
          <div className="text-muted-foreground">{denom.label}</div>
          <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">{t("total")}</div>
          <div className="font-display text-4xl font-black text-gradient">{formatDZD(denom.price_dzd)}</div>
          <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-bold text-primary-foreground glow disabled:opacity-50">
            <Lock className="h-4 w-4" />{busy ? "…" : t("payNow")}
          </button>
        </aside>
      </form>
    </SiteShell>
  );
}
