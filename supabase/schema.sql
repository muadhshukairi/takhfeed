-- ============================================================
-- Oman Grocery Price Comparison - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- STORES
-- ============================================================
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  source text not null,           -- e.g. 'talabat'
  url text not null,
  logo_url text,
  delivery_fee numeric(6,3),      -- in OMR
  min_order numeric(6,3),         -- in OMR
  delivery_time_min int,          -- minutes
  delivery_time_max int,
  rating numeric(3,2),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  icon text,                      -- emoji or icon name
  parent_id uuid references categories(id),
  created_at timestamptz default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  name_normalized text,           -- lowercase, trimmed for deduplication
  brand text,
  size text,
  unit text,                      -- e.g. 'g', 'ml', 'pcs'
  quantity numeric,               -- numeric quantity (e.g. 500 for 500g)
  category_id uuid references categories(id),
  image_url text,
  barcode text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PRODUCT PRICES (per store)
-- ============================================================
create table if not exists product_prices (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  price numeric(8,3) not null,    -- regular price in OMR
  offer_price numeric(8,3),       -- discounted price if any
  is_available boolean default true,
  product_url text,               -- direct URL to product on store
  scraped_at timestamptz default now(),
  unique(product_id, store_id)
);

-- ============================================================
-- SCRAPING LOGS
-- ============================================================
create table if not exists scraping_logs (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id),
  source text not null,           -- 'talabat', etc.
  status text not null,           -- 'success', 'partial', 'failed'
  products_scraped int default 0,
  products_updated int default 0,
  errors_count int default 0,
  error_messages text[],
  duration_ms int,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_product_prices_product on product_prices(product_id);
create index if not exists idx_product_prices_store on product_prices(store_id);
create index if not exists idx_products_name on products(name_normalized);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_stores_source on stores(source);

-- Full text search index
create index if not exists idx_products_fts on products using gin(to_tsvector('english', name));

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table stores enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_prices enable row level security;
alter table scraping_logs enable row level security;

-- Public read access
create policy "Public read stores" on stores for select using (true);
create policy "Public read categories" on categories for select using (true);
create policy "Public read products" on products for select using (true);
create policy "Public read product_prices" on product_prices for select using (true);
create policy "Public read scraping_logs" on scraping_logs for select using (true);

-- Service role write access (used by scraper via service key)
create policy "Service write stores" on stores for all using (auth.role() = 'service_role');
create policy "Service write categories" on categories for all using (auth.role() = 'service_role');
create policy "Service write products" on products for all using (auth.role() = 'service_role');
create policy "Service write product_prices" on product_prices for all using (auth.role() = 'service_role');
create policy "Service write scraping_logs" on scraping_logs for all using (auth.role() = 'service_role');

-- ============================================================
-- SEED: Initial categories
-- ============================================================
insert into categories (name, slug, icon) values
  ('Fruits & Vegetables', 'fruits-vegetables', '🥦'),
  ('Meat & Seafood', 'meat-seafood', '🥩'),
  ('Dairy & Eggs', 'dairy-eggs', '🥛'),
  ('Bakery', 'bakery', '🍞'),
  ('Beverages', 'beverages', '🥤'),
  ('Snacks', 'snacks', '🍿'),
  ('Household', 'household', '🏠'),
  ('Personal Care', 'personal-care', '🧴'),
  ('Frozen Food', 'frozen-food', '🧊'),
  ('Pantry & Dry Goods', 'pantry-dry-goods', '🛒')
on conflict (slug) do nothing;
