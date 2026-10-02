import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/SiteShell";
import { adminFulfill, adminRevealCode, claimFirstAdmin } from "@/lib/orders.functions";
import { formatDZD } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Admin — ch7nli" }, { name: "description", content: "Store dashboard." },
    { property: "og:title", content: "Admin — ch7nli" }, { property: "og:description", content: "Store dashboard." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Admin,
});

const input = "w-full rounded-xl border bg-input/30 px-4 py-3 outline-none focus:border-primary";

function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const claim = useServerFn(claimFirstAdmin);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setIsAdmin(false);
    (async () => {
      const check = async () => (await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" })).data === true;
      if (await check()) return setIsAdmin(true);
      const r = await claim();
      setIsAdmin(r.granted || (await check()));
    })();
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login />;
  if (!isAdmin) return <Center><p>Ce compte n'est pas administrateur.</p><button className="mt-4 underline" onClick={() => supabase.auth.signOut()}>Se déconnecter</button></Center>;
  return <Dashboard />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center px-4"><div className="w-full max-w-sm text-center">{children}</div></div>;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [f, setF] = useState({ e: "", p: "" });
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email: f.e, password: f.p })
      : await supabase.auth.signUp({ email: f.e, password: f.p, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    if (error) toast.error(error.message);
    else if (mode === "up") toast.success("Vérifiez votre email pour confirmer le compte.");
  };
  return (
    <Center>
      <div className="mb-8 flex justify-center"><Logo /></div>
      <form onSubmit={submit} className="space-y-3 text-start">
        <input required type="email" placeholder="Email" className={input} value={f.e} onChange={(e) => setF({ ...f, e: e.target.value })} />
        <input required type="password" minLength={8} placeholder="Mot de passe" className={input} value={f.p} onChange={(e) => setF({ ...f, p: e.target.value })} />
        <button className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">{mode === "in" ? "Connexion" : "Créer le compte"}</button>
      </form>
      <button className="mt-4 text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Premier accès ? Créer le compte admin" : "Déjà un compte ? Connexion"}
      </button>
    </Center>
  );
}

type Order = { id: string; order_number: string; customer_name: string; email: string; phone: string; product_name: string; denomination_label: string; amount_dzd: number; payment_status: string; fulfillment_status: string; fulfillment_error: string | null; created_at: string };
type Denom = { id: string; label: string; price_dzd: number; in_stock: boolean; sort: number; provider_product_id: string | null; provider_unit_price: number | null };
type Prod = { id: string; name: string; brand: string; slug: string; category: string; theme: string; in_stock: boolean; featured: boolean; denominations: Denom[] };

function Dashboard() {
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const fulfill = useServerFn(adminFulfill);
  const reveal = useServerFn(adminRevealCode);

  const load = async () => {
    const [o, p] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("products").select("*,denominations(*)").order("popularity", { ascending: false }),
    ]);
    setOrders((o.data ?? []) as Order[]);
    setProducts((p.data ?? []) as unknown as Prod[]);
  };
  useEffect(() => { load(); }, []);

  const paid = orders.filter((o) => o.payment_status === "paid");
  const now = Date.now();
  const today = paid.filter((o) => now - +new Date(o.created_at) < 864e5);
  const week = paid.filter((o) => now - +new Date(o.created_at) < 7 * 864e5);
  const best = Object.entries(paid.reduce<Record<string, number>>((a, o) => ((a[o.product_name] = (a[o.product_name] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between"><Logo /><button className="text-sm underline" onClick={() => supabase.auth.signOut()}>Déconnexion</button></div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat l="Commandes aujourd'hui" v={String(today.length)} />
        <Stat l="Commandes 7 jours" v={String(week.length)} />
        <Stat l="Revenu 7 jours" v={formatDZD(week.reduce((s, o) => s + o.amount_dzd, 0))} />
        <Stat l="Top ventes" v={best.map(([n, c]) => `${n} (${c})`).join(", ") || "—"} small />
      </div>
      <div className="mb-4 inline-flex rounded-full border p-1">
        {(["orders", "products"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t === "orders" ? "Commandes" : "Produits"}</button>
        ))}
      </div>

      {tab === "orders" ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-card text-start text-xs uppercase text-muted-foreground"><tr>{["N°", "Client", "Produit", "Montant", "Paiement", "Livraison", ""].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t align-top">
                  <td className="p-3 font-mono text-xs">{o.order_number}<div className="text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")}</div></td>
                  <td className="p-3">{o.customer_name}<div className="text-xs text-muted-foreground">{o.email} · {o.phone}</div></td>
                  <td className="p-3">{o.product_name}<div className="text-xs text-muted-foreground">{o.denomination_label}</div></td>
                  <td className="p-3 font-bold">{formatDZD(o.amount_dzd)}</td>
                  <td className="p-3"><Pill s={o.payment_status} /></td>
                  <td className="p-3"><Pill s={o.fulfillment_status} />{o.fulfillment_error && <div className="mt-1 max-w-48 text-xs text-destructive">{o.fulfillment_error}</div>}</td>
                  <td className="space-y-1 p-3 text-xs">
                    {o.fulfillment_status !== "fulfilled" ? (<>
                      <button className="block underline" onClick={async () => { await fulfill({ data: { orderId: o.id } }); toast("Relancé"); load(); }}>Relancer auto</button>
                      <button className="block font-bold text-primary underline" onClick={async () => {
                        const code = prompt("Code à livrer au client :"); if (!code) return;
                        await fulfill({ data: { orderId: o.id, code } }); toast.success("Marquée livrée"); load();
                      }}>Marquer livrée</button>
                    </>) : (
                      <button className="underline" onClick={async () => { const r = await reveal({ data: { orderId: o.id } }); alert(r.code ?? "—"); }}>Voir code</button>
                    )}
                  </td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune commande</td></tr>}
            </tbody>
          </table>
        </div>
      ) : <Products products={products} reload={load} />}
    </div>
  );
}

function Stat({ l, v, small }: { l: string; v: string; small?: boolean }) {
  return <div className="rounded-xl border bg-card p-4"><div className="text-xs text-muted-foreground">{l}</div><div className={`mt-1 font-display font-bold ${small ? "text-sm" : "text-2xl"}`}>{v}</div></div>;
}
function Pill({ s }: { s: string }) {
  const c = s === "paid" || s === "fulfilled" ? "bg-success/15 text-success" : s === "failed" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c}`}>{s}</span>;
}

function Products({ products, reload }: { products: Prod[]; reload: () => void }) {
  const run = async (p: PromiseLike<{ error: unknown }>) => { const { error } = await p; if (error) toast.error("Erreur"); reload(); };
  const addProduct = async () => {
    const name = prompt("Nom du produit"); if (!name) return;
    const brand = prompt("Marque", name) ?? name;
    const category = prompt("Catégorie (gaming / entertainment)", "gaming") === "entertainment" ? "entertainment" : "gaming";
    await run(supabase.from("products").insert({ name, brand, category, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }));
  };
  return (
    <div className="space-y-4">
      <button onClick={addProduct} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">+ Produit</button>
      {products.map((p) => (
        <div key={p.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input className="rounded-lg border bg-transparent px-2 py-1 font-display font-bold" defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && run(supabase.from("products").update({ name: e.target.value }).eq("id", p.id))} />
            <span className="text-xs text-muted-foreground">{p.category}</span>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={p.in_stock} onChange={(e) => run(supabase.from("products").update({ in_stock: e.target.checked }).eq("id", p.id))} /> En stock</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={p.featured} onChange={(e) => run(supabase.from("products").update({ featured: e.target.checked }).eq("id", p.id))} /> Vedette</label>
            <button className="ms-auto text-xs text-destructive underline" onClick={() => confirm(`Supprimer ${p.name} ?`) && run(supabase.from("products").delete().eq("id", p.id))}>Supprimer</button>
          </div>
          <div className="mt-3 space-y-2">
            {[...p.denominations].sort((a, b) => a.sort - b.sort).map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                <input className="w-24 rounded border bg-transparent px-2 py-1" defaultValue={d.label} onBlur={(e) => run(supabase.from("denominations").update({ label: e.target.value }).eq("id", d.id))} />
                <input type="number" className="w-28 rounded border bg-transparent px-2 py-1" defaultValue={d.price_dzd} onBlur={(e) => run(supabase.from("denominations").update({ price_dzd: Number(e.target.value) }).eq("id", d.id))} /> DA
                <input placeholder="Reloadly ID" className="w-28 rounded border bg-transparent px-2 py-1" defaultValue={d.provider_product_id ?? ""} onBlur={(e) => run(supabase.from("denominations").update({ provider_product_id: e.target.value || null }).eq("id", d.id))} />
                <input placeholder="Prix unitaire" type="number" step="0.01" className="w-28 rounded border bg-transparent px-2 py-1" defaultValue={d.provider_unit_price ?? ""} onBlur={(e) => run(supabase.from("denominations").update({ provider_unit_price: e.target.value ? Number(e.target.value) : null }).eq("id", d.id))} />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={d.in_stock} onChange={(e) => run(supabase.from("denominations").update({ in_stock: e.target.checked }).eq("id", d.id))} /> Stock</label>
                <button className="text-xs text-destructive" onClick={() => run(supabase.from("denominations").delete().eq("id", d.id))}>✕</button>
              </div>
            ))}
            <button className="text-xs text-primary underline" onClick={() => {
              const label = prompt("Montant (ex: 25 €)"); const price = Number(prompt("Prix DZD"));
              if (label && price) run(supabase.from("denominations").insert({ product_id: p.id, label, price_dzd: price, sort: p.denominations.length + 1 }));
            }}>+ Montant</button>
          </div>
        </div>
      ))}
    </div>
  );
}
