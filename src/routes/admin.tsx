import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, LogOut, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminStatus, claimAdmin, syncReloadly } from "@/lib/sync.functions";
import { BRANDS, type SyncBrand, type SyncResult } from "@/lib/sync-brands";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — ch7nli" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Admin,
});

const COUNTRIES = ["DZ", "TN", "MA", "FR", "US", "GB", "DE", "TR", "AE", "SA", "EG"];

function Admin() {
  const check = useServerFn(adminStatus);
  const session = useQuery({
    queryKey: ["admin-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { signedIn: false as const, isAdmin: false };
      try {
        const status = await check({ data: undefined });
        return { signedIn: true as const, isAdmin: status.isAdmin };
      } catch {
        return { signedIn: true as const, isAdmin: false };
      }
    },
    staleTime: 30_000,
  });

  if (session.isLoading)
    return (
      <Frame>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </Frame>
    );
  if (!session.data?.signedIn)
    return (
      <Frame>
        <SignIn onDone={() => session.refetch()} />
      </Frame>
    );
  if (!session.data.isAdmin)
    return (
      <Frame>
        <NotAdmin />
      </Frame>
    );
  return (
    <Frame>
      <SyncPanel />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-black">Admin</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = "rounded-lg border bg-background px-3 py-2 text-sm w-full";

  return (
    <form
      className="space-y-3 rounded-2xl border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) return setError(error.message);
        onDone();
      }}
    >
      <h2 className="font-bold">Sign in</h2>
      <input
        className={field}
        type="email"
        required
        placeholder="admin@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className={field}
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded-full bg-primary py-2.5 font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function NotAdmin() {
  const claim = useServerFn(claimAdmin);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-6">
      <h2 className="font-bold">This account is not an admin</h2>
      <p className="text-sm text-muted-foreground">
        If you are the first user, you can claim the admin role. Once an admin exists this button
        stops working.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await claim({ data: undefined });
            setMsg(r.granted ? "Admin role granted. Reloading…" : "An admin already exists.");
            if (r.granted) await qc.invalidateQueries({ queryKey: ["admin-session"] });
          } catch (e) {
            setMsg((e as Error).message);
          }
          setBusy(false);
        }}
        className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Checking…" : "Claim admin"}
      </button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}

function SyncPanel() {
  const run = useServerFn(syncReloadly);
  const [brands, setBrands] = useState<SyncBrand[]>(["steam"]);
  const [country, setCountry] = useState("DZ");
  const [rate, setRate] = useState("150");
  const [margin, setMargin] = useState("1.15");
  const [overwrite, setOverwrite] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const field = "rounded-lg border bg-background px-3 py-2 text-sm";

  const toggle = (b: SyncBrand) =>
    setBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <div>
          <h2 className="font-bold">Sync from Reloadly</h2>
          <p className="text-sm text-muted-foreground">
            Pulls GET /products and creates or updates products and denominations. Prices are
            computed from the sender-currency amount we are billed.
          </p>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold">Brands</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BRANDS) as SyncBrand[]).map((b) => (
              <button
                key={b}
                onClick={() => toggle(b)}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold ${brands.includes(b) ? "border-primary bg-primary text-primary-foreground" : ""}`}
              >
                {BRANDS[b].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Country
            <select className={field} value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            DZD per sender unit
            <input
              className={field}
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Margin
            <input
              className={field}
              type="number"
              min="1"
              step="0.01"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Dry run (preview only, writes nothing)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            Overwrite existing DZD prices
          </label>
        </div>

        <button
          disabled={busy || !brands.length}
          onClick={async () => {
            setBusy(true);
            setError(null);
            setResult(null);
            try {
              setResult(
                await run({
                  data: {
                    brands,
                    countryCode: country,
                    dzdRate: Number(rate),
                    margin: Number(margin),
                    overwritePrices: overwrite,
                    dryRun,
                  },
                }),
              );
            } catch (e) {
              setError((e as Error).message);
            }
            setBusy(false);
          }}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {busy ? "Syncing…" : dryRun ? "Preview sync" : "Sync now"}
        </button>
        {!dryRun && (
          <p className="text-xs text-warning">Live run: this writes to the database immediately.</p>
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}
      </section>

      {result && <ResultPanel r={result} />}
    </div>
  );
}

function ResultPanel({ r }: { r: SyncResult }) {
  const stats: [string, number][] = [
    ["Fetched", r.fetched],
    ["Matched", r.matched],
    ["New products", r.createdProducts],
    ["Updated products", r.updatedProducts],
    ["New denominations", r.createdDenominations],
    ["Updated denominations", r.updatedDenominations],
    ["Skipped RANGE", r.skippedRange],
    ["Skipped inactive", r.skippedInactive],
  ];
  return (
    <section className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-lg font-black">{v}</dd>
          </div>
        ))}
      </dl>
      {r.preview.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Country</th>
                <th className="p-3">Denominations</th>
              </tr>
            </thead>
            <tbody>
              {r.preview.map((p) => (
                <tr key={p.slug} className="border-b last:border-0 align-top">
                  <td className="p-3 font-semibold">{p.product}</td>
                  <td className="p-3 font-mono text-xs">{p.slug}</td>
                  <td className="p-3">{p.country}</td>
                  <td className="p-3 text-muted-foreground">{p.denominations.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.unmapped.length > 0 && (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer font-bold">{r.unmapped.length} skipped</summary>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {r.unmapped.map((u, i) => (
              <li key={i}>
                {u.product} — {u.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
