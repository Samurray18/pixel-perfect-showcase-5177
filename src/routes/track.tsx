import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { OrderView } from "@/components/site/OrderView";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [
    { title: "Suivre ma commande — ch7nli" }, { name: "description", content: "Vérifiez le statut de votre commande avec son numéro et votre email." },
    { property: "og:title", content: "Suivre ma commande — ch7nli" }, { property: "og:description", content: "Statut de commande et récupération du code." },
  ] }),
  component: Track,
});

function Track() {
  const { t } = useI18n();
  const [f, setF] = useState({ n: "", e: "" });
  const [q, setQ] = useState<{ n: string; e: string } | null>(null);
  const input = "w-full rounded-xl border bg-input/30 px-4 py-3 outline-none focus:border-primary";
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-black">{t("track")}</h1>
        <p className="mt-2 text-muted-foreground">{t("trackSub")}</p>
        <form onSubmit={(e) => { e.preventDefault(); setQ({ n: f.n.trim().toUpperCase(), e: f.e.trim() }); }} className="mt-6 space-y-3">
          <input required placeholder="C7-XXXX-XXXXX" className={input} value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} />
          <input required type="email" placeholder={t("email")} className={input} value={f.e} onChange={(e) => setF({ ...f, e: e.target.value })} />
          <button className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground glow">{t("find")}</button>
        </form>
        {q && <div className="mt-8"><OrderView key={q.n + q.e} orderNumber={q.n} email={q.e} /></div>}
      </div>
    </SiteShell>
  );
}
