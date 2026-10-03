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
  publish: z.boolean().default(false),
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

// Sets retail (price_dzd) from the wholesale cost Reloadly charges us
// (provider_unit_price), so the owner controls the markup on top of cost.
export const applyMarkup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        dzdRate: z.number().positive(),
        markup: z.number().min(1),
        productId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { explainDbError } = await import("@/lib/server/catalog-sync.server");

    let query = supabaseAdmin
      .from("denominations")
      .select("id,provider_unit_price,price_dzd")
      .not("provider_unit_price", "is", null);
    if (data.productId) query = query.eq("product_id", data.productId);
    const { data: rows, error } = await query;
    if (error) throw new Error(explainDbError(error));

    let updated = 0;
    for (const row of rows ?? []) {
      const cost = Number(row.provider_unit_price);
      if (!Number.isFinite(cost) || cost <= 0) continue;
      const price = Math.max(1, Math.round(cost * data.dzdRate * data.markup));
      if (price === row.price_dzd) continue;
      const { error: updateError } = await supabaseAdmin
        .from("denominations")
        .update({ price_dzd: price })
        .eq("id", row.id);
      if (updateError) throw new Error(explainDbError(updateError));
      updated += 1;
    }
    return { scanned: rows?.length ?? 0, updated };
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
