import { NextResponse } from 'next/server';

/**
 * POST /api/scrape
 * Triggers the Playwright scraper.
 * NOTE: On Netlify static hosting, run the scraper locally:
 *   npm run scrape
 * Then redeploy so the updated Supabase data is reflected.
 *
 * For server-based hosting (Railway, Render, VPS), this route
 * triggers the scraper as a background process.
 */
export async function POST() {
  // On Netlify (static export), this route is not available.
  // Run the scraper locally: npm run scrape
  try {
    const { exec } = await import('child_process');
    const path = await import('path');
    const scriptPath = path.join(process.cwd(), 'scripts', 'scraper.ts');
    exec(
      `npx ts-node --project ${process.cwd()}/tsconfig.scripts.json ${scriptPath}`,
      { env: { ...process.env }, cwd: process.cwd() },
      (error) => { if (error) console.error('[Scraper]', error.message); }
    );
    return NextResponse.json({ success: true, message: 'Scraper started. Check Logs tab in ~30s.' });
  } catch {
    return NextResponse.json({
      success: false,
      message: 'Run the scraper locally: npm run scrape'
    }, { status: 501 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', hint: 'POST to trigger scraper (local/server only)' });
}
