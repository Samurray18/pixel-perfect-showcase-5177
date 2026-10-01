import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { BrandTile } from "./BrandTile";
import { formatDZD, useI18n } from "@/lib/i18n";
import { minPrice, type Product } from "@/lib/catalog";

export function ProductCard({ p }: { p: Product }) {
  const { t } = useI18n();
  return (
    <Link to="/products/$slug" params={{ slug: p.slug }}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-3 transition hover:-translate-y-1 hover:border-primary hover:glow">
      <BrandTile theme={p.theme} brand={p.brand} className="aspect-[16/10]" />
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="font-display text-base font-semibold">{p.name}</h3>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
          <Zap className="h-3 w-3" />{t("instant")}
        </span>
      </div>
      <div className="px-1 pb-1">
        <div className="text-xs text-muted-foreground">{t("from")}</div>
        <div className="font-display text-2xl font-bold">{p.denominations.length ? formatDZD(minPrice(p)) : "—"}</div>
        {!p.in_stock && <div className="text-xs font-semibold text-destructive">{t("outOfStock")}</div>}
      </div>
    </Link>
  );
}
