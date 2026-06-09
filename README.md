# Takhfeed — تخفيض
### Oman Grocery Price Comparison

Compare grocery prices across **Lulu, Carrefour, Sultan Center, Al Meera, Al Amri, and Talabat** in Oman. Bilingual English/Arabic, mobile responsive, OMR pricing.

🌐 **Live site:** `https://takhfeed.netlify.app` *(after deployment)*

---

## Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React, TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Scraping | Playwright (Chromium) |
| Hosting | Netlify (free) |
| Languages | English + Arabic (RTL) |

---

## Quick Start

### 1. Install
```bash
npm install
npx playwright install chromium
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the Supabase SQL editor

### 3. Configure
```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and keys
```

### 4. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Scrape first data
```bash
npm run scrape
```

---

## Deploy to Netlify

### Option A — GitHub (recommended, auto-deploys)
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/takhfeed.git
git push -u origin main
```
Then: Netlify → Add new site → Import from GitHub → pick `takhfeed`

Add env vars in Netlify → Site settings → Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Option B — Drag & Drop
```bash
npm run build   # creates out/ folder
```
Drag the `out/` folder to [app.netlify.com](https://app.netlify.com)

---

## Scraping

Run locally anytime to refresh prices:
```bash
npm run scrape
```
Data goes directly to Supabase. The live Netlify site reads from Supabase in real-time — no redeployment needed.

### Adding more stores
Edit `scripts/scraper.ts` → add entries to `TALABAT_STORES`:
```typescript
{
  name: 'Talabat Groceries – Muscat',
  slug: 'talabat-muscat',
  url: 'https://www.talabat.com/oman/groceries/YOUR_ID/muscat',
}
```

---

## Project Structure
```
takhfeed/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Homepage + search
│   │   ├── compare/          # Price comparison
│   │   ├── basket/           # Basket comparison
│   │   └── admin/            # Admin dashboard
│   ├── components/
│   │   ├── Navbar.tsx        # With EN/AR toggle
│   │   └── ProductCard.tsx
│   └── lib/
│       ├── supabase.ts       # DB client + queries
│       └── lang.tsx          # i18n context (EN/AR)
├── scripts/
│   └── scraper.ts            # Playwright scraper
├── supabase/
│   └── schema.sql            # DB schema + RLS
├── netlify.toml              # Netlify build config
└── .env.local.example
```

---

Built for Oman 🇴🇲 | مصنوع لعُمان
