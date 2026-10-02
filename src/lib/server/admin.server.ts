import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Admin gate shared by server functions that mutate the catalog or orders.
type AdminContext = { supabase: SupabaseClient<Database>; userId: string };

export async function assertAdmin(ctx: AdminContext) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}
