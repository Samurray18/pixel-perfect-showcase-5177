// Shared between the /admin client route and the server-only sync module, so
// neither side has to import a .server.ts file.
export type SyncBrand = "steam" | "pubg" | "psn" | "xbox" | "netflix" | "spotify";

// productName is a server-side substring filter on Reloadly, so each brand maps to
// several search terms; the sync re-checks locally too because it matches loosely.
export const BRANDS: Record<
  SyncBrand,
  { label: string; terms: string[]; category: "gaming" | "entertainment"; theme: string }
> = {
  steam: { label: "Steam", terms: ["steam"], category: "gaming", theme: "steam" },
  pubg: { label: "PUBG Mobile", terms: ["pubg"], category: "gaming", theme: "pubg" },
  psn: {
    label: "PlayStation",
    terms: ["playstation", "psn", "ps store"],
    category: "gaming",
    theme: "psn",
  },
  xbox: { label: "Xbox", terms: ["xbox"], category: "gaming", theme: "xbox" },
  netflix: { label: "Netflix", terms: ["netflix"], category: "entertainment", theme: "netflix" },
  spotify: { label: "Spotify", terms: ["spotify"], category: "entertainment", theme: "spotify" },
};

export type SyncOptions = {
  brands: SyncBrand[];
  countryCode: string;
  dzdRate: number;
  margin: number;
  overwritePrices: boolean;
  dryRun: boolean;
  // New products are created unpublished so you can set your own retail price
  // before they appear in the storefront.
  publish: boolean;
};

export type SyncResult = {
  fetched: number;
  matched: number;
  skippedRange: number;
  skippedInactive: number;
  createdProducts: number;
  updatedProducts: number;
  createdDenominations: number;
  updatedDenominations: number;
  unmapped: { product: string; reason: string }[];
  preview: { product: string; slug: string; country: string; denominations: string[] }[];
};
