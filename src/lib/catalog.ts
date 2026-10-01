import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Denomination = { id: string; label: string; price_dzd: number; in_stock: boolean; sort: number };
export type Product = {
  id: string; slug: string; name: string; brand: string; category: "gaming" | "entertainment";
  description_fr: string; description_ar: string; theme: string; in_stock: boolean; popularity: number; featured: boolean;
  denominations: Denomination[];
};

const select = "id,slug,name,brand,category,description_fr,description_ar,theme,in_stock,popularity,featured,denominations(id,label,price_dzd,in_stock,sort)";

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select(select).order("popularity", { ascending: false });
    if (error) throw error;
    return (data as unknown as Product[]).map((p) => ({ ...p, denominations: [...p.denominations].sort((a, b) => a.sort - b.sort) }));
  },
});

export const minPrice = (p: Product) => Math.min(...p.denominations.map((d) => d.price_dzd));
