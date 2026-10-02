-- Reloadly catalog sync support.
-- /products returns no per-denomination IDs, so provider_product_id on a
-- denomination row is the product-level Reloadly id and provider_unit_price is
-- the amount charged in sender currency (what we actually pay).

alter table public.products add column if not exists logo_url text;
alter table public.products add column if not exists country_code text;
alter table public.products add column if not exists provider_product_id text;
alter table public.products add column if not exists provider_brand_id int;
alter table public.products add column if not exists provider_synced_at timestamptz;

alter table public.denominations add column if not exists recipient_amount numeric;
alter table public.denominations add column if not exists currency_code text;

-- Postgres treats NULLs as distinct, so pre-sync rows seeded with NULL stay valid.
create unique index if not exists products_provider_product_id_key
  on public.products (provider_product_id);

create unique index if not exists denominations_provider_key
  on public.denominations (product_id, provider_unit_price);