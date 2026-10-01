import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-display text-lg font-black text-primary-foreground glow">7</span>
      <span className="font-display text-xl font-black tracking-tight">ch<span className="text-primary">7</span>nli</span>
    </Link>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold sm:flex">
            <Link to="/products" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>{t("catalog")}</Link>
            <Link to="/track" className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>{t("track")}</Link>
          </nav>
          <div className="flex rounded-full border p-1 text-xs font-bold">
            {(["fr", "ar"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {l === "fr" ? "FR" : "عربي"}
              </button>
            ))}
          </div>
        </div>
        <nav className="flex justify-center gap-6 border-t py-2 text-sm font-semibold sm:hidden">
          <Link to="/products" className="text-muted-foreground">{t("catalog")}</Link>
          <Link to="/track" className="text-muted-foreground">{t("track")}</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="mt-24 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <span>© {new Date().getFullYear()} ch7nli — Edahabia · CIB</span>
        </div>
      </footer>
    </div>
  );
}
