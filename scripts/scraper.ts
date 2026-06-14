import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import ws from 'ws';

(globalThis as any).WebSocket = ws;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ── Stores to scrape ────────────────────────────────────────────────────────
const STORES = [
  { name: 'Lulu Hypermarket',  slug: 'lulu',      id: 706051 },
  { name: 'HyperMax',          slug: 'hypermax',   id: 32503  },
  { name: 'Sultan Center',     slug: 'sultan',     id: 776366 },
  { name: 'Al Meera',          slug: 'almeera',    id: 799774 },
  { name: 'Al Amri Center',    slug: 'alamri',     id: 725354 },
  { name: 'Viva',              slug: 'viva',        id: 722155 },
  { name: 'Noor Online',       slug: 'noor',        id: 670500 },
  { name: 'Spinneys',          slug: 'spinneys',    id: 702993 },
];

const TALABAT_API = 'https://www.talabat.com/api/v1';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.talabat.com/',
  'Origin': 'https://www.talabat.com',
  'x-talabat-platform': 'web',
};

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function parsePrice(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

async function scrapeStore(supabase: any, store: typeof STORES[0]) {
  console.log(`\n📦 Scraping ${store.name} (id: ${store.id})`);

  // 1. Upsert store
  const { data: storeData, error: storeErr } = await supabase
    .from('stores')
    .upsert({ name: store.name, slug: store.slug, source: 'talabat', is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
    .select('id').single();
  if (storeErr) { console.error(`  ✗ Store upsert failed: ${storeErr.message}`); return; }
  const storeId = storeData.id;
  console.log(`  ✓ Store ready (id: ${storeId})`);

  // 2. Get categories via API
  let categories: { id: number; name: string }[] = [];
  try {
    const catUrl = `${TALABAT_API}/vendor/${store.id}/menu?languageCode=en`;
    console.log(`  → Fetching categories from: ${catUrl}`);
    const catData = await fetchJson(catUrl);
    if (catData?.categories) {
      categories = catData.categories.map((c: any) => ({ id: c.id, name: c.name }));
    } else if (catData?.data?.categories) {
      categories = catData.data.categories.map((c: any) => ({ id: c.id, name: c.name }));
    }
    console.log(`  ✓ Found ${categories.length} categories`);
  } catch (e: any) {
    console.warn(`  ⚠ Could not fetch categories via API: ${e.message}`);
    // Try alternative endpoint
    try {
      const altUrl = `${TALABAT_API}/vendor/${store.id}/categories?languageCode=en`;
      const altData = await fetchJson(altUrl);
      if (Array.isArray(altData)) categories = altData.map((c: any) => ({ id: c.id, name: c.name || c.title }));
      else if (altData?.categories) categories = altData.categories.map((c: any) => ({ id: c.id, name: c.name }));
      console.log(`  ✓ Found ${categories.length} categories (alt endpoint)`);
    } catch (e2: any) {
      console.error(`  ✗ Alt categories also failed: ${e2.message}`);
    }
  }

  if (categories.length === 0) {
    // Try getting products directly without categories
    console.log(`  → Trying direct products endpoint...`);
    await scrapeProductsDirect(supabase, store, storeId);
    return;
  }

  // 3. Get products per category
  let totalProducts = 0;
  for (const cat of categories) {
    try {
      console.log(`  📂 Category: ${cat.name}`);
      await sleep(500);

      let page = 1;
      let hasMore = true;
      let catProducts = 0;

      while (hasMore) {
        const prodUrl = `${TALABAT_API}/vendor/${store.id}/items?categoryId=${cat.id}&page=${page}&pageSize=50&languageCode=en`;
        const prodData = await fetchJson(prodUrl);

        const items: any[] = prodData?.items || prodData?.data?.items || prodData?.products || [];
        if (items.length === 0) { hasMore = false; break; }

        for (const item of items) {
          const name = item.name || item.nameEn || item.title || '';
          const price = item.price || item.priceValue || item.originalPrice || 0;
          const offerPrice = item.discountedPrice || item.promotionalPrice || null;
          const imageUrl = item.imageUrl || item.image || item.photo || null;
          const size = item.size || item.weight || item.quantity || null;

          if (!name || !price) continue;

          // Upsert category
          const catSlug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const { data: catRow } = await supabase.from('categories')
            .upsert({ name: cat.name, slug: catSlug }, { onConflict: 'slug' })
            .select('id').single();

          // Upsert product
          const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
          let productId: string;
          const { data: existingProd } = await supabase.from('products')
            .select('id').eq('name_normalized', normalized).maybeSingle();

          if (existingProd) {
            productId = existingProd.id;
          } else {
            const { data: newProd, error: prodErr } = await supabase.from('products')
              .insert({ name, name_normalized: normalized, size, category_id: catRow?.id, image_url: imageUrl, updated_at: new Date().toISOString() })
              .select('id').single();
            if (prodErr) continue;
            productId = newProd.id;
          }

          // Upsert price
          await supabase.from('product_prices').upsert({
            product_id: productId,
            store_id: storeId,
            price: parseFloat(price),
            offer_price: offerPrice ? parseFloat(offerPrice) : null,
            is_available: true,
            scraped_at: new Date().toISOString(),
          }, { onConflict: 'product_id,store_id' });

          catProducts++;
        }

        console.log(`     Page ${page}: ${items.length} items (total: ${catProducts})`);
        hasMore = items.length === 50;
        page++;
        await sleep(300);
      }

      console.log(`     ✓ ${catProducts} products for ${cat.name}`);
      totalProducts += catProducts;
    } catch (e: any) {
      console.error(`  ✗ Error in category ${cat.name}: ${e.message}`);
    }
  }

  console.log(`  ✅ Done: ${totalProducts} products scraped for ${store.name}`);
}

async function scrapeProductsDirect(supabase: any, store: typeof STORES[0], storeId: string) {
  // Try various API endpoints
  const endpoints = [
    `${TALABAT_API}/vendor/${store.id}/items?page=1&pageSize=100&languageCode=en`,
    `${TALABAT_API}/grocery/${store.id}/products?languageCode=en`,
    `https://api.talabat.com/v2/vendor/${store.id}/menu?languageCode=en`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`  → Trying: ${url}`);
      const data = await fetchJson(url);
      const items: any[] = data?.items || data?.products || data?.data?.items || [];
      if (items.length > 0) {
        console.log(`  ✓ Found ${items.length} products directly`);
        // Process items...
        return;
      }
    } catch (e: any) {
      console.warn(`  ⚠ ${url}: ${e.message}`);
    }
  }
  console.log(`  ✗ No products found for ${store.name} - API may require auth`);
}

async function main() {
  console.log('🛒 Oman Grocery Scraper — Talabat API');
  console.log('=====================================\n');

  // Load .env.local if available
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    for (const line of env.split('\n')) {
      const [key, ...vals] = line.split('=');
      if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
    }
  }

  const supabase = getSupabase();
  let totalAll = 0;

  for (const store of STORES) {
    try {
      await scrapeStore(supabase, store);
    } catch (e: any) {
      console.error(`✗ Store ${store.name} failed: ${e.message}`);
    }
    await sleep(2000);
  }

  console.log('\n🏁 Scraping complete!');
}

main().catch(e => { console.error(e); process.exit(1); });
