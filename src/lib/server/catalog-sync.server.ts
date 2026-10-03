import { reloadlyFetch, reloadlyConfigured } from "./reloadly.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BRANDS, type SyncBrand, type SyncOptions, type SyncResult } from "@/lib/sync-brands";

export { BRANDS, type SyncBrand, type SyncOptions, type SyncResult };

const PAGE_SIZE = 200;
const MAX_PAGES = 25;

type ReloadlyProduct = {
  productId: number;
  productName: string;
  status?: string;
  denominationType?: string;
  recipientCurrencyCode?: string;
  senderCurrencyCode?: string;
  fixedRecipientDenominations?: (number | null)[];
  fixedSenderDenominations?: (number | null)[];
  logoUrls?: string[];
  brand?: { brandId?: number; brandName?: string };
  country?: { isoName?: string; name?: string };
};

export type SyncBrandKey = SyncBrand;

// Surfaces the most likely cause instead of a raw Postgres error: the sync
// migration not being applied yet.
export function explainDbError(e: { message: string; code?: string | null } | null) {
  if (!e) return "unknown error";
  const code = e.code ?? "";
  const msg = e.message ?? "";
  if (code === "42703" || code === "PGRST204" || /column .* (does not exist|not found)/i.test(msg)) {
    return "Missing columns. Apply supabase/migrations/20261002120000_reloadly_catalog_sync.sql first (supabase db push), then retry.";
  }
  if (code === "42P01" || /relation .* does not exist/i.test(msg)) {
    return "Missing table. Apply the initial migrations in supabase/migrations first.";
  }
  if (code === "23505" || /duplicate key value/i.test(msg)) {
    return "A row with this provider id or slug already exists. Try a different country.";
  }
  return msg;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function fetchPage(
  productName: string,
  countryCode: string,
  page: number,
): Promise<ReloadlyProduct[]> {
  const qs = new URLSearchParams({
    size: String(PAGE_SIZE),
    page: String(page),
    productName,
    countryCode,
    includeFixed: "true",
    includeRange: "false",
  });
  const body = await reloadlyFetch(`/products?${qs}`);
  // Docs show a bare array; tolerate a paged envelope in case that changes.
  if (Array.isArray(body)) return body as ReloadlyProduct[];
  const content = (body as { content?: unknown }).content;
  return Array.isArray(content) ? (content as ReloadlyProduct[]) : [];
}

export async function syncReloadlyCatalog(opts: SyncOptions): Promise<SyncResult> {
  if (!reloadlyConfigured())
    throw new Error(
      "Reloadly is not configured (RELOADLY_CLIENT_ID / RELOADLY_CLIENT_SECRET missing)",
    );
  if (!opts.brands.length) throw new Error("Select at least one brand to import");
  if (!(opts.dzdRate > 0)) throw new Error("DZD rate must be greater than 0");
  if (!(opts.margin >= 1)) throw new Error("Margin must be at least 1 (100% = no markup)");

  const result: SyncResult = {
    fetched: 0,
    matched: 0,
    skippedRange: 0,
    skippedInactive: 0,
    createdProducts: 0,
    updatedProducts: 0,
    createdDenominations: 0,
    updatedDenominations: 0,
    unmapped: [],
    preview: [],
  };

  for (const brandKey of opts.brands) {
    const brand = BRANDS[brandKey];
    for (const term of brand.terms) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const items = await fetchPage(term, opts.countryCode, page);
        if (!items.length) break;
        result.fetched += items.length;
        for (const item of items) {
          const haystack = `${item.productName} ${item.brand?.brandName ?? ""}`.toLowerCase();
          if (!brand.terms.some((t) => haystack.includes(t))) continue;
          result.matched += 1;
          if (item.status && item.status !== "ACTIVE") {
            result.skippedInactive += 1;
            continue;
          }
          if (item.denominationType === "RANGE") {
            result.skippedRange += 1;
            result.unmapped.push({
              product: item.productName,
              reason: "RANGE denomination (no fixed amounts)",
            });
            continue;
          }
          await importProduct(item, brand, opts, result);
        }
        if (items.length < PAGE_SIZE) break;
      }
    }
  }
  return result;
}

async function importProduct(
  item: ReloadlyProduct,
  brand: (typeof BRANDS)[SyncBrand],
  opts: SyncOptions,
  result: SyncResult,
) {
  const providerId = String(item.productId);
  const country = (item.country?.isoName ?? opts.countryCode).toUpperCase();
  const recipients = item.fixedRecipientDenominations ?? [];
  const senders = item.fixedSenderDenominations ?? [];
  if (!senders.length) {
    result.unmapped.push({ product: item.productName, reason: "no denominations returned" });
    return;
  }

  const denominations = senders
    .map((senderAmount, i) => {
      if (senderAmount == null || senderAmount <= 0) return null;
      const recipientAmount = recipients[i] ?? null;
      const currency = item.recipientCurrencyCode ?? "—";
      const label =
        recipientAmount != null
          ? `${trimNumber(recipientAmount)} ${currency}`
          : `${trimNumber(senderAmount)} ${item.senderCurrencyCode ?? currency}`;
      // We are billed in sender currency, so that is what the order call must send.
      const priceDzd = Math.max(1, Math.round(senderAmount * opts.dzdRate * opts.margin));
      return {
        label,
        price_dzd: priceDzd,
        provider_product_id: providerId,
        provider_unit_price: senderAmount,
        recipient_amount: recipientAmount,
        currency_code: item.recipientCurrencyCode ?? null,
        sort: i + 1,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  if (!denominations.length) {
    result.unmapped.push({ product: item.productName, reason: "all denominations zero or null" });
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("id,slug")
    .eq("provider_product_id", providerId)
    .maybeSingle();

  const productId = existing?.id ?? null;
  const slug = existing?.slug ?? `${slugify(item.productName)}-${country.toLowerCase()}`;

  result.preview.push({
    product: item.productName,
    slug,
    country,
    denominations: denominations.map((d) => `${d.label} → ${d.price_dzd} DZD`),
  });
  if (opts.dryRun) return;

  const productRow = {
    slug: existing?.slug ?? `${slugify(item.productName)}-${country.toLowerCase()}`,
    provider_product_id: providerId,
    provider_brand_id: item.brand?.brandId ?? null,
    name: item.productName,
    brand: item.brand?.brandName ?? brand.label,
    category: brand.category,
    logo_url: item.logoUrls?.[0] ?? null,
    country_code: country,
    in_stock: opts.publish,
    provider_synced_at: new Date().toISOString(),
    ...(productId ? {} : { theme: brand.theme, description_fr: "", description_ar: "" }),
  };

  const { data: saved, error } = await supabaseAdmin
    .from("products")
    .upsert(productRow, { onConflict: "provider_product_id" })
    .select("id")
    .single();
  if (error || !saved) {
    result.unmapped.push({
      product: item.productName,
      reason: `product upsert failed: ${explainDbError(error)}`,
    });
    return;
  }
  if (productId) result.updatedProducts += 1;
  else result.createdProducts += 1;

  const { data: existingDenoms } = await supabaseAdmin
    .from("denominations")
    .select("provider_unit_price")
    .eq("product_id", saved.id);
  const known = new Set((existingDenoms ?? []).map((d) => Number(d.provider_unit_price)));

  for (const denom of denominations) {
    const patch = { ...denom, product_id: saved.id };
    const { error: denomError } = await supabaseAdmin
      .from("denominations")
      .upsert(patch, { onConflict: "product_id,provider_unit_price" });
    if (denomError) {
      result.unmapped.push({
        product: item.productName,
        reason: `${denom.label}: ${explainDbError(denomError)}`,
      });
      continue;
    }
    if (known.has(denom.provider_unit_price)) {
      result.updatedDenominations += 1;
      if (opts.overwritePrices) {
        await supabaseAdmin
          .from("denominations")
          .update({ price_dzd: denom.price_dzd })
          .eq("product_id", saved.id)
          .eq("provider_unit_price", denom.provider_unit_price);
      }
    } else {
      result.createdDenominations += 1;
    }
  }
}

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}
