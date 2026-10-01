import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Headphones, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { productsQuery } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ch7nli — Gift cards & game top-ups delivered instantly in Algeria" },
      { name: "description", content: "Buy Steam, PUBG UC, PSN, Xbox, Netflix and Spotify in DZD with Edahabia or CIB. Codes delivered in seconds." },
      { property: "og:title", content: "ch7nli — Cartes cadeaux & recharges jeux" },
      { property: "og:description", content: "Payez en DZD par Edahabia ou CIB. Livraison instantanée." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(productsQuery);
  const [tab, setTab] = useState<"gaming" | "entertainment">("gaming");
  const featured = data.filter((p) => p.featured);
  const tabbed = data.filter((p) => p.category === tab);

  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b">
        <img src={hero} alt="" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <h1 className="max-w-3xl text-4xl font-black leading-[1.05] sm:text-6xl">
            {t("heroTitle")} <span className="text-gradient">{t("heroAccent")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t("heroSub")}</p>
          <Link to="/products" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-bold text-primary-foreground glow transition hover:scale-105">
            {t("shopNow")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:grid-cols-3">
        {[{ i: Zap, k: "instant" as const }, { i: ShieldCheck, k: "secure" as const }, { i: Headphones, k: "support" as const }].map(({ i: I, k }) => (
          <div key={k} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><I className="h-5 w-5" /></span>
            <span className="font-semibold">{t(k)}</span>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-6 text-3xl font-black">{t("featured")}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 inline-flex rounded-full border bg-card p-1">
          {(["gaming", "entertainment"] as const).map((c) => (
            <button key={c} onClick={() => setTab(c)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition ${tab === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t(c)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {tabbed.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </SiteShell>
  );
}
