import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Zap } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { BrandTile } from "@/components/site/BrandTile";
import { productsQuery } from "@/lib/catalog";
import { formatDZD, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ context, params }) => {
    const all = await context.queryClient.ensureQueryData(productsQuery);
    const p = all.find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { name: p.name, desc: p.description_fr };
  },
  head: ({ loaderData }) => loaderData
    ? { meta: [
        { title: `${loaderData.name} en DZD — ch7nli` },
        { name: "description", content: loaderData.desc },
        { property: "og:title", content: `${loaderData.name} — ch7nli` },
        { property: "og:description", content: loaderData.desc },
      ] }
    : { meta: [{ title: "Introuvable — ch7nli" }, { name: "robots", content: "noindex" }] },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { data } = useSuspenseQuery(productsQuery);
  const p = data.find((x) => x.slug === slug)!;
  const first = p.denominations.find((d) => d.in_stock) ?? p.denominations[0];
  const [sel, setSel] = useState(first?.id);
  const d = p.denominations.find((x) => x.id === sel);
  const available = p.in_stock && d?.in_stock;

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
        <BrandTile theme={p.theme} brand={p.brand} logoUrl={p.logo_url} big className="aspect-[4/3] glow" />
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary"><Zap className="h-3 w-3" />{t("instant")}</span>
          <h1 className="mt-4 text-4xl font-black sm:text-5xl">{p.name}</h1>
          <p className="mt-3 text-muted-foreground">{lang === "ar" ? p.description_ar : p.description_fr}</p>
          <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("chooseDenom")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {p.denominations.map((x) => (
              <button key={x.id} disabled={!x.in_stock} onClick={() => setSel(x.id)}
                className={`rounded-xl border-2 p-3 text-start transition disabled:opacity-40 ${sel === x.id ? "border-primary bg-primary/10 glow" : "bg-card hover:border-primary/50"}`}>
                <div className="font-display text-lg font-bold">{x.label}</div>
                <div className="text-sm text-muted-foreground">{formatDZD(x.price_dzd)}</div>
              </button>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border bg-card p-5">
            <div className="text-sm text-muted-foreground">{t("total")}</div>
            <div className="font-display text-5xl font-black text-gradient">{d ? formatDZD(d.price_dzd) : "—"}</div>
            <button disabled={!available}
              onClick={() => d && nav({ to: "/checkout", search: { d: d.id } })}
              className="mt-5 w-full rounded-full bg-primary py-4 text-lg font-bold text-primary-foreground glow transition hover:scale-[1.02] disabled:opacity-40">
              {available ? t("buyNow") : t("outOfStock")}
            </button>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
