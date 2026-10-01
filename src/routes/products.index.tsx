import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { minPrice, productsQuery } from "@/lib/catalog";
import { formatDZD, useI18n } from "@/lib/i18n";

const search = z.object({
  category: z.enum(["all", "gaming", "entertainment"]).catch("all"),
  brand: z.string().catch("all"),
  max: z.number().catch(20000),
  sort: z.enum(["popular", "asc", "desc"]).catch("popular"),
});

export const Route = createFileRoute("/products/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Catalogue — ch7nli" },
      { name: "description", content: "Toutes nos cartes cadeaux et recharges jeux, prix en DZD." },
      { property: "og:title", content: "Catalogue — ch7nli" },
      { property: "og:description", content: "Steam, PUBG UC, PSN, Xbox, Netflix, Spotify en DZD." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Catalog,
});

function Catalog() {
  const { t } = useI18n();
  const s = Route.useSearch();
  const nav = useNavigate({ from: "/products/" });
  const { data } = useSuspenseQuery(productsQuery);
  const brands = [...new Set(data.map((p) => p.brand))];
  let list = data.filter((p) => (s.category === "all" || p.category === s.category) && (s.brand === "all" || p.brand === s.brand) && p.denominations.length && minPrice(p) <= s.max);
  if (s.sort === "asc") list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
  if (s.sort === "desc") list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
  const set = (patch: Partial<z.infer<typeof search>>) => nav({ search: (p) => ({ ...p, ...patch }) });
  const sel = "rounded-lg border bg-card px-3 py-2 text-sm font-semibold";

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-4xl font-black">{t("catalog")}</h1>
        <div className="mb-8 flex flex-wrap items-end gap-3">
          <div className="inline-flex rounded-full border bg-card p-1">
            {(["all", "gaming", "entertainment"] as const).map((c) => (
              <button key={c} onClick={() => set({ category: c })}
                className={`rounded-full px-4 py-1.5 text-sm font-bold ${s.category === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t(c)}</button>
            ))}
          </div>
          <select className={sel} value={s.brand} onChange={(e) => set({ brand: e.target.value })}>
            <option value="all">{t("brand")}: {t("all")}</option>
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select>
          <label className="flex flex-col text-xs text-muted-foreground">
            {t("maxPrice")}: <b className="text-foreground">{formatDZD(s.max)}</b>
            <input type="range" min={500} max={20000} step={500} value={s.max} onChange={(e) => set({ max: Number(e.target.value) })} className="accent-primary" />
          </label>
          <select className={sel} value={s.sort} onChange={(e) => set({ sort: e.target.value as "popular" })}>
            <option value="popular">{t("popular")}</option>
            <option value="asc">{t("priceAsc")}</option>
            <option value="desc">{t("priceDesc")}</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </SiteShell>
  );
}
