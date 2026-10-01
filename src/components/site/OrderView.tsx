import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";
import { getOrder, simulatePayment } from "@/lib/orders.functions";
import { formatDZD, useI18n } from "@/lib/i18n";

export function OrderView({ orderNumber, email }: { orderNumber: string; email: string }) {
  const { t } = useI18n();
  const fetchOrder = useServerFn(getOrder);
  const sim = useServerFn(simulatePayment);
  const [copied, setCopied] = useState(false);
  const [simBusy, setSimBusy] = useState(false);
  const q = useQuery({
    queryKey: ["order", orderNumber, email],
    queryFn: () => fetchOrder({ data: { orderNumber, email } }),
    refetchInterval: (query) => (query.state.data?.fulfillmentStatus === "fulfilled" || query.state.data?.paymentStatus === "failed" ? false : 4000),
  });
  if (q.isLoading) return <div className="grid place-items-center p-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  const o = q.data;
  if (!o) return <p className="p-10 text-center text-muted-foreground">{t("notFound")}</p>;

  const statusLabel = (s: string) => t((["paid", "pending", "fulfilled", "failed"].includes(s) ? s : "pending") as "paid");

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        {o.paymentStatus === "failed" ? <XCircle className="h-8 w-8 text-destructive" /> : <CheckCircle2 className="h-8 w-8 text-success" />}
        <h1 className="text-2xl font-black sm:text-3xl">{t("orderThanks")}</h1>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-muted-foreground">{t("orderNo")}</dt><dd className="font-mono font-bold">{o.orderNumber}</dd></div>
        <div><dt className="text-muted-foreground">{t("total")}</dt><dd className="font-display text-xl font-bold">{formatDZD(o.amount)}</dd></div>
        <div><dt className="text-muted-foreground">{o.product}</dt><dd className="font-bold">{o.denomination}</dd></div>
        <div><dt className="text-muted-foreground">{t("status")}</dt><dd className="font-bold">{statusLabel(o.paymentStatus)} · {statusLabel(o.fulfillmentStatus)}</dd></div>
      </dl>

      {o.code ? (
        <div className="mt-8 rounded-xl border-2 border-primary bg-primary/10 p-5 glow">
          <div className="text-sm font-bold text-primary">{t("yourCode")}</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <code dir="ltr" className="break-all font-mono text-xl font-bold sm:text-2xl">{o.code}</code>
            <button onClick={() => { navigator.clipboard.writeText(o.code!); setCopied(true); }}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
              <Copy className="h-4 w-4" />{copied ? t("copied") : t("copy")}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("codeEmailed")}</p>
        </div>
      ) : o.paymentStatus !== "failed" && (
        <div className="mt-8 flex items-center gap-3 rounded-xl border p-5 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          {o.paymentStatus === "paid" ? t("waitingCode") : t("waitingPay")}
        </div>
      )}

      {o.testMode && o.paymentStatus === "pending" && (
        <button disabled={simBusy} onClick={async () => { setSimBusy(true); await sim({ data: { orderNumber, email } }); await q.refetch(); setSimBusy(false); }}
          className="mt-4 w-full rounded-full border-2 border-dashed border-warning py-3 text-sm font-bold text-warning disabled:opacity-50">
          {t("simulate")}
        </button>
      )}
    </div>
  );
}
