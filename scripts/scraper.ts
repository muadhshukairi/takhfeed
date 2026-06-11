/**
 * Talabat Oman Grocery Scraper
 * Uses Playwright to scrape product listings from Talabat grocery pages.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/scraper.ts
 *
 * Env vars required (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Rate limiting: 2–5 second delays between requests, max 3 concurrent pages.
 */

import { chromium, Browser, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import ws from 'ws';

// Fix for Node.js < 22 WebSocket support (needed for Supabase)
(globalThis as any).WebSocket = ws;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const TALABAT_STORES: { name: string; slug: string; url: string }[] = [
  {
    name: 'Lulu Hypermarket',
    slug: 'lulu',
    url: 'https://www.talabat.com/oman/grocery/706051/lulu-hypermarket-ansab',
  },
  {
    name: 'HyperMax',
    slug: 'hypermax',
    url: 'https://www.talabat.com/oman/grocery/32503/hypermax-seeb-muscat',
  },
  {
    name: 'Sultan Center',
    slug: 'sultan',
    url: 'https://www.talabat.com/oman/grocery/776366/sultan-center-hail-south',
  },
  {
    name: 'Al Meera',
    slug: 'almeera',
    url: 'https://www.talabat.com/oman/grocery/799774/al-meera-express-the-wave',
  },
  {
    name: 'Al Amri Center',
    slug: 'alamri',
    url: 'https://www.talabat.com/oman/grocery/725354/al-amri-center-al-koudh',
  },
  {
    name: 'Viva',
    slug: 'viva',
    url: 'https://www.talabat.com/oman/grocery/722155/viva-al-koudh',
  },
  {
    name: 'Noor Online',
    slug: 'noor',
    url: 'https://www.talabat.com/oman/grocery/670500/noor-online-al-mawalih-south-twin-muscat',
  },
  {
    name: 'Spinneys',
    slug: 'spinneys',
    url: 'https://www.talabat.com/oman/grocery/702993/spinneys-the-wave',
  },
];

const DELAY_MIN_MS = 1500;
const DELAY_MAX_MS = 3000;
const MAX_CATEGORIES = 50; // scrape all categories
const MAX_PRODUCTS_PER_CATEGORY = 500; // get all products per category

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  const ms = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
  return sleep(ms);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePrice(text: string): number | null {
  const match = text.replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function normalizeProductName(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Supabase client (service role for writes)
// ---------------------------------------------------------------------------
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.\n' +
        'Copy .env.local.example to .env.local and fill in your Supabase credentials.'
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------
interface ScrapedProduct {
  name: string;
  brand?: string;
  size?: string;
  category: string;
  price: number;
  offer_price?: number;
  image_url?: string;
  product_url: string;
}

interface StoreInfo {
  name: string;
  slug: string;
  url: string;
  delivery_fee?: number;
  min_order?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  rating?: number;
}

async function scrapeStoreInfo(page: Page, storeUrl: string): Promise<StoreInfo> {
  console.log(`  → Scraping store info from ${storeUrl}`);
  await page.goto(storeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  let deliveryFee: number | undefined;
  let minOrder: number | undefined;
  let deliveryTimeMin: number | undefined;
  let deliveryTimeMax: number | undefined;
  let rating: number | undefined;

  try {
    // Delivery fee
    const feeEl = await page.$('[data-testid="delivery-fee"], .delivery-fee, [class*="deliveryFee"]');
    if (feeEl) {
      const feeText = await feeEl.textContent();
      if (feeText) deliveryFee = parsePrice(feeText) ?? undefined;
    }

    // Min order
    const minEl = await page.$('[data-testid="minimum-order"], [class*="minOrder"]');
    if (minEl) {
      const minText = await minEl.textContent();
      if (minText) minOrder = parsePrice(minText) ?? undefined;
    }

    // Delivery time
    const timeEl = await page.$('[data-testid="delivery-time"], [class*="deliveryTime"]');
    if (timeEl) {
      const timeText = await timeEl.textContent();
      if (timeText) {
        const times = timeText.match(/(\d+)/g);
        if (times && times.length >= 2) {
          deliveryTimeMin = parseInt(times[0]);
          deliveryTimeMax = parseInt(times[1]);
        } else if (times && times.length === 1) {
          deliveryTimeMin = parseInt(times[0]);
          deliveryTimeMax = parseInt(times[0]);
        }
      }
    }

    // Rating
    const ratingEl = await page.$('[data-testid="vendor-rating"], [class*="rating"]');
    if (ratingEl) {
      const ratingText = await ratingEl.textContent();
      if (ratingText) rating = parsePrice(ratingText) ?? undefined;
    }
  } catch (e) {
    console.warn('  ⚠ Could not parse some store info fields');
  }

  return {
    name: TALABAT_STORES.find((s) => s.url === storeUrl)?.name || 'Unknown Store',
    slug: TALABAT_STORES.find((s) => s.url === storeUrl)?.slug || slugify(storeUrl),
    url: storeUrl,
    delivery_fee: deliveryFee,
    min_order: minOrder,
    delivery_time_min: deliveryTimeMin,
    delivery_time_max: deliveryTimeMax,
    rating,
  };
}

async function scrapeCategoryProducts(
  page: Page,
  categoryUrl: string,
  categoryName: string
): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = [];

  try {
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for products to load
    await page
      .waitForSelector('[data-testid="product-card"], [class*="product-card"], [class*="productCard"]', {
        timeout: 15000,
      })
      .catch(() => console.warn(`  ⚠ No product cards found for category: ${categoryName}`));

    await sleep(1500);

    // Scrape all pages
    let pageNum = 1;
    let allRawProducts: any[] = [];

    while (true) {
      console.log(`  → Scraping page ${pageNum} of ${categoryName}...`);

      // Scroll to load lazy content
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);

      // Extract products from current page
      const pageProducts = await page.evaluate((catName: string) => {
        const cards = document.querySelectorAll(
          '[data-testid="product-card"], [class*="product-card"], [class*="productCard"], .item-info'
        );
        const results: any[] = [];
        cards.forEach((card) => {
          try {
            const nameEl =
              card.querySelector('[data-testid="product-name"]') ||
              card.querySelector('[class*="name"]') ||
              card.querySelector('h3') ||
              card.querySelector('h4') ||
              card.querySelector('p');
            const name = nameEl?.textContent?.trim() || '';
            if (!name || name.length < 2) return;

            const priceEl =
              card.querySelector('[data-testid="product-price"]') ||
              card.querySelector('[class*="price"]:not([class*="old"]):not([class*="original"])');
            const priceText = priceEl?.textContent?.trim() || '';

            const offerEl =
              card.querySelector('[data-testid="offer-price"]') ||
              card.querySelector('[class*="old-price"], [class*="oldPrice"], [class*="original-price"]');
            const offerText = offerEl?.textContent?.trim() || '';

            const imgEl = card.querySelector('img');
            const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';

            const sizeMatch = name.match(/\d+\s*(g|kg|ml|l|pcs|pack|pieces|oz|lb)\b/i);
            const size = sizeMatch ? sizeMatch[0] : '';

            const linkEl = card.querySelector('a');
            const productUrl = linkEl?.href || window.location.href;

            results.push({ name, size, category: catName, price_text: priceText, offer_text: offerText, image_url: imageUrl, product_url: productUrl });
          } catch (e) {}
        });
        return results;
      }, categoryName);

      allRawProducts = allRawProducts.concat(pageProducts);
      console.log(`  → Got ${pageProducts.length} products on page ${pageNum} (total: ${allRawProducts.length})`);

      if (allRawProducts.length >= MAX_PRODUCTS_PER_CATEGORY) break;

      // Try to go to next page
      const nextPageNum = pageNum + 1;
      const nextPageClicked = await page.evaluate((nextNum: number) => {
        // Try aria-label
        const byAria = document.querySelector(`a[aria-label="Go to page ${nextNum}"]`) as HTMLElement;
        if (byAria) { byAria.click(); return true; }
        // Try by text content in pagination
        const allLinks = document.querySelectorAll('[class*="pagination"] a, [class*="Pagination"] a');
        for (const link of Array.from(allLinks)) {
          if (link.textContent?.trim() === String(nextNum)) {
            (link as HTMLElement).click();
            return true;
          }
        }
        // Try next button
        const nextBtn = document.querySelector('a[aria-label="Go to next page"], button[aria-label="Next page"]') as HTMLElement;
        if (nextBtn && !nextBtn.getAttribute('disabled')) { nextBtn.click(); return true; }
        return false;
      }, nextPageNum);

      if (!nextPageClicked) {
        console.log(`  → No more pages for ${categoryName}`);
        break;
      }

      await sleep(2000);
      await page.waitForSelector('[data-testid="product-card"], [class*="product-card"], [class*="productCard"]', { timeout: 10000 }).catch(() => {});
      pageNum++;
    }

    console.log(`  → Total products scraped for ${categoryName}: ${allRawProducts.length}`);

    // Parse prices
    for (const raw of allRawProducts.slice(0, MAX_PRODUCTS_PER_CATEGORY)) {
      const price = parsePrice(raw.price_text);
      if (!price || price <= 0) continue;

      const offerPrice = raw.offer_text ? parsePrice(raw.offer_text) : undefined;

      products.push({
        name: raw.name,
        size: raw.size || undefined,
        category: raw.category,
        price,
        offer_price: offerPrice && offerPrice < price ? offerPrice : undefined,
        image_url: raw.image_url || undefined,
        product_url: raw.product_url,
      });
    }
  } catch (err: any) {
    console.error(`  ✗ Error scraping category ${categoryName}: ${err.message}`);
  }

  return products;
}

async function scrapeCategories(
  page: Page,
  storeUrl: string
): Promise<{ name: string; url: string }[]> {
  const categories: { name: string; url: string }[] = [];

  try {
    await page.goto(storeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    const cats = await page.evaluate(() => {
      const items: { name: string; url: string }[] = [];

      // Talabat category links
      const selectors = [
        'a[href*="/category/"]',
        'a[href*="/c/"]',
        '[class*="category"] a',
        '[data-testid="category-item"] a',
        'nav a',
      ];

      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 2) {
          els.forEach((el) => {
            const name = el.textContent?.trim() || '';
            const href = (el as HTMLAnchorElement).href || '';
            if (name && href && href.includes('talabat.com')) {
              items.push({ name, url: href });
            }
          });
          if (items.length > 0) break;
        }
      }

      return items;
    });

    // Deduplicate
    const seen = new Set<string>();
    for (const cat of cats) {
      if (!seen.has(cat.url) && cat.name.length > 1) {
        seen.add(cat.url);
        categories.push(cat);
      }
    }
  } catch (err: any) {
    console.error(`  ✗ Error scraping categories: ${err.message}`);
  }

  return categories.slice(0, MAX_CATEGORIES);
}

// ---------------------------------------------------------------------------
// Database upserts
// ---------------------------------------------------------------------------
async function upsertStore(supabase: any, info: StoreInfo): Promise<string> {
  const { data, error } = await supabase
    .from('stores')
    .upsert(
      {
        name: info.name,
        slug: info.slug,
        source: 'talabat',
        url: info.url,
        delivery_fee: info.delivery_fee,
        min_order: info.min_order,
        delivery_time_min: info.delivery_time_min,
        delivery_time_max: info.delivery_time_max,
        rating: info.rating,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (error) throw new Error(`Store upsert failed: ${error.message}`);
  return data.id;
}

async function upsertCategory(supabase: any, name: string): Promise<string> {
  const slug = slugify(name);
  const { data, error } = await supabase
    .from('categories')
    .upsert({ name, slug }, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id')
    .single();

  if (error) throw new Error(`Category upsert failed: ${error.message}`);
  return data.id;
}

async function upsertProduct(
  supabase: any,
  product: ScrapedProduct,
  categoryId: string
): Promise<string> {
  const normalized = normalizeProductName(product.name);

  // Try to find existing product by normalized name
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('name_normalized', normalized)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      name_normalized: normalized,
      size: product.size,
      category_id: categoryId,
      image_url: product.image_url,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(`Product insert failed: ${error.message}`);
  return data.id;
}

async function upsertPrice(
  supabase: any,
  productId: string,
  storeId: string,
  product: ScrapedProduct
) {
  const { error } = await supabase.from('product_prices').upsert(
    {
      product_id: productId,
      store_id: storeId,
      price: product.price,
      offer_price: product.offer_price,
      is_available: true,
      product_url: product.product_url,
      scraped_at: new Date().toISOString(),
    },
    { onConflict: 'product_id,store_id', ignoreDuplicates: false }
  );

  if (error) throw new Error(`Price upsert failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🛒 Oman Grocery Scraper — Talabat');
  console.log('=====================================\n');

  // Load env from .env.local if running outside Next.js
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    env.split('\n').forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
  }

  const supabase = getSupabase();

  let browser: Browser | null = null;

  for (const storeConfig of TALABAT_STORES) {
    const logId = (
      await supabase
        .from('scraping_logs')
        .insert({
          source: 'talabat',
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()
    ).data?.id;

    const errors: string[] = [];
    let productsScraped = 0;
    let productsUpdated = 0;
    const startTime = Date.now();

    try {
      console.log(`\n📦 Store: ${storeConfig.name}`);
      console.log(`   URL: ${storeConfig.url}\n`);

      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        viewport: { width: 1280, height: 800 },
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const page = await context.newPage();

      // 1. Scrape store info
      const storeInfo = await scrapeStoreInfo(page, storeConfig.url);
      const storeId = await upsertStore(supabase, storeInfo);
      console.log(`  ✓ Store upserted (id: ${storeId})`);

      // 2. Scrape categories
      await randomDelay();
      const categories = await scrapeCategories(page, storeConfig.url);
      console.log(`  ✓ Found ${categories.length} categories\n`);

      // 3. Scrape products per category
      for (const cat of categories) {
        console.log(`  📂 Category: ${cat.name}`);
        await randomDelay();

        try {
          const categoryId = await upsertCategory(supabase, cat.name);
          const products = await scrapeCategoryProducts(page, cat.url, cat.name);
          console.log(`     Found ${products.length} products`);

          for (const product of products) {
            try {
              const productId = await upsertProduct(supabase, product, categoryId);
              await upsertPrice(supabase, productId, storeId, product);
              productsScraped++;
              productsUpdated++;
            } catch (err: any) {
              errors.push(`Product "${product.name}": ${err.message}`);
            }
          }
        } catch (err: any) {
          errors.push(`Category "${cat.name}": ${err.message}`);
        }
      }

      await browser.close();
      browser = null;

      // Update log
      const duration = Date.now() - startTime;
      await supabase
        .from('scraping_logs')
        .update({
          store_id: storeId,
          status: errors.length === 0 ? 'success' : 'partial',
          products_scraped: productsScraped,
          products_updated: productsUpdated,
          errors_count: errors.length,
          error_messages: errors.slice(0, 20),
          duration_ms: duration,
          finished_at: new Date().toISOString(),
        })
        .eq('id', logId);

      console.log(`\n  ✅ Done: ${productsScraped} products scraped in ${(duration / 1000).toFixed(1)}s`);
      if (errors.length > 0) {
        console.log(`  ⚠  ${errors.length} errors (see scraping_logs table)`);
      }
    } catch (err: any) {
      console.error(`\n  ✗ Fatal error for store ${storeConfig.name}: ${err.message}`);
      if (browser) await browser.close();

      await supabase
        .from('scraping_logs')
        .update({
          status: 'failed',
          errors_count: 1,
          error_messages: [err.message],
          finished_at: new Date().toISOString(),
        })
        .eq('id', logId);
    }
  }

  console.log('\n🏁 Scraping complete.');
}

main().catch(console.error);
