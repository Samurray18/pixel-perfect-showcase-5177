import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/server/admin.server";

const BRAND_KEYS = ["steam", "pubg", "psn", "xbox", "netflix", "spotify"] as const;

const SyncInput = z.object({
  brands: z.array(z.enum(BRAND_KEYS)).min(1),
  countryCode: z.string().trim().length(2).toUpperCase(),
  dzdRate: z.number().positive(),
  margin: z.number().min(1),
  overwritePrices: z.boolean().default(false),
  dryRun: z.boolean().default(true),
});

export const syncReloadly = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SyncInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { syncReloadlyCatalog } = await import("@/lib/server/catalog-sync.server");
    return syncReloadlyCatalog(data);
  });

export const reloadlyBrands = createServerFn({ method: "GET" }).handler(async () => {
  const { BRANDS } = await import("@/lib/sync-brands");
  return BRANDS;
});

export const adminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { granted: false };
    await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    return { granted: true };
  });
