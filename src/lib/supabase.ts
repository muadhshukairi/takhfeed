import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Store {
  id: string;
  name: string;
  slug: string;
  source: string;
  url: string;
  logo_url?: string;
  delivery_fee?: number;
  min_order?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  rating?: number;
  is_active: boolean;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  size?: string;
  unit?: string;
  category_id?: string;
  image_url?: string;
  categories?: Category;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  store_id: string;
  price: number;
  offer_price?: number;
  is_available: boolean;
  product_url?: string;
  scraped_at: string;
  stores?: Store;
  products?: Product;
}

export interface ScrapingLog {
  id: string;
  store_id?: string;
  source: string;
  status: string;
  products_scraped: number;
  products_updated: number;
  errors_count: number;
  error_messages?: string[];
  duration_ms?: number;
  started_at: string;
  finished_at?: string;
  stores?: Store;
}

// Queries
export async function searchProducts(query: string, categoryId?: string, limit = 20) {
  let q = supabase
    .from('products')
    .select(`
      *,
      categories(*),
      product_prices(*, stores(*))
    `)
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (categoryId) q = q.eq('category_id', categoryId);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getProductWithPrices(productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(*),
      product_prices(*, stores(*))
    `)
    .eq('id', productId)
    .single();

  if (error) throw error;
  return data;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function getStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function getRecentProducts(limit = 20) {
  const { data, error } = await supabase
    .from('product_prices')
    .select(`
      *,
      products(*, categories(*)),
      stores(*)
    `)
    .order('scraped_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getProductsByCategory(categorySlug: string, limit = 40) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories!inner(*),
      product_prices(*, stores(*))
    `)
    .eq('categories.slug', categorySlug)
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getScrapingLogs(limit = 20) {
  const { data, error } = await supabase
    .from('scraping_logs')
    .select('*, stores(*)')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export function formatOMR(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `OMR ${amount.toFixed(3)}`;
}

export function getBestPrice(prices: ProductPrice[]): ProductPrice | null {
  if (!prices || prices.length === 0) return null;
  return prices.reduce((best, p) => {
    const eff = p.offer_price ?? p.price;
    const bestEff = best.offer_price ?? best.price;
    return eff < bestEff ? p : best;
  });
}
