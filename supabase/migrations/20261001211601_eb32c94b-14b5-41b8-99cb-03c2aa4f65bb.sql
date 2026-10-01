create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  brand text not null,
  category text not null check (category in ('gaming','entertainment')),
  description_fr text not null default '',
  description_ar text not null default '',
  theme text not null default 'blue',
  in_stock boolean not null default true,
  popularity int not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.denominations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  price_dzd int not null,
  provider_product_id text,
  provider_unit_price numeric,
  in_stock boolean not null default true,
  sort int not null default 0
);
grant select on public.products, public.denominations to anon, authenticated;
grant insert, update, delete on public.products, public.denominations to authenticated;
grant all on public.products, public.denominations to service_role;
alter table public.products enable row level security;
alter table public.denominations enable row level security;
create policy "public read products" on public.products for select using (true);
create policy "public read denoms" on public.denominations for select using (true);
create policy "admin write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin write denoms" on public.denominations for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  product_id uuid references public.products(id) on delete set null,
  denomination_id uuid references public.denominations(id) on delete set null,
  product_name text not null,
  denomination_label text not null,
  amount_dzd int not null,
  payment_method text not null,
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'pending',
  checkout_id text,
  code_encrypted text,
  fulfillment_error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  fulfilled_at timestamptz
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admin read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

with p as (
  insert into public.products (slug,name,brand,category,description_fr,description_ar,theme,popularity,featured) values
  ('steam-wallet','Steam Wallet','Steam','gaming','Rechargez votre portefeuille Steam et achetez jeux, DLC et objets.','اشحن محفظة ستيم واشترِ الألعاب والإضافات.','steam',95,true),
  ('pubg-mobile-uc','PUBG Mobile UC','PUBG Mobile','gaming','Unknown Cash pour skins, Royale Pass et caisses.','شدات ببجي موبايل للأزياء والرويال باس.','pubg',100,true),
  ('playstation-store','PlayStation Store','PlayStation','gaming','Carte PSN pour jeux, PS Plus et contenus.','بطاقة بلايستيشن للألعاب واشتراك PS Plus.','psn',80,true),
  ('xbox-gift-card','Xbox Gift Card','Xbox','gaming','Jeux, Game Pass et contenus sur Xbox et PC.','ألعاب وجيم باس على إكس بوكس والكمبيوتر.','xbox',60,false),
  ('netflix','Netflix Gift Card','Netflix','entertainment','Films et séries en illimité, sans carte bancaire.','أفلام ومسلسلات بلا حدود دون بطاقة بنكية.','netflix',85,true),
  ('spotify-premium','Spotify Premium','Spotify','entertainment','Musique sans pub, hors ligne, en haute qualité.','موسيقى بلا إعلانات وبدون إنترنت.','spotify',70,true)
  returning id, slug
)
insert into public.denominations (product_id,label,price_dzd,sort)
select p.id, d.label, d.price, d.sort from p join (values
  ('steam-wallet','10 €',2900,1),('steam-wallet','25 €',7100,2),('steam-wallet','50 €',14000,3),
  ('pubg-mobile-uc','60 UC',250,1),('pubg-mobile-uc','325 UC',1200,2),('pubg-mobile-uc','660 UC',2350,3),('pubg-mobile-uc','1800 UC',6200,4),
  ('playstation-store','10 €',2950,1),('playstation-store','25 €',7200,2),('playstation-store','50 €',14200,3),
  ('xbox-gift-card','10 €',2950,1),('xbox-gift-card','25 €',7200,2),('xbox-gift-card','50 €',14200,3),
  ('netflix','15 €',4300,1),('netflix','25 €',7100,2),('netflix','50 €',14000,3),
  ('spotify-premium','1 mois',1600,1),('spotify-premium','3 mois',4500,2),('spotify-premium','12 mois',16500,3)
) as d(slug,label,price,sort) on d.slug=p.slug;