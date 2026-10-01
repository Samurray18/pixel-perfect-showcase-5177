import { cn } from "@/lib/utils";

const themes: Record<string, string> = {
  steam: "brand-steam", pubg: "brand-pubg", psn: "brand-psn", xbox: "brand-xbox", netflix: "brand-netflix", spotify: "brand-spotify",
};

export function BrandTile({ theme, brand, className, big }: { theme: string; brand: string; className?: string; big?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl", themes[theme] ?? "brand-blue", className)}>
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="absolute -end-6 -top-6 h-24 w-24 rounded-full bg-foreground/10 blur-xl" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="h-6 w-9 rounded-md bg-foreground/25" />
        <span className={cn("font-display font-bold text-foreground drop-shadow", big ? "text-4xl" : "text-xl")}>{brand}</span>
      </div>
    </div>
  );
}
