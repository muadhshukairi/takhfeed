'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Zap, ChevronRight, TrendingDown } from 'lucide-react';
import { searchProducts, getCategories, getRecentProducts, formatOMR } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { useLang } from '@/lib/lang';
import Link from 'next/link';

export default function HomePage() {
  const { t, lang } = useLang();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [basket, setBasket] = useState<any[]>([]);
  const AF = lang === 'ar' ? "'Noto Sans Arabic', Tahoma, sans-serif" : 'inherit';

  useEffect(() => {
    Promise.all([getCategories(), getRecentProducts(12)]).then(([cats, recent]) => {
      setCategories(cats || []);
      const prods = (recent || []).map((r: any) => r.products).filter(Boolean);
      const seen: Record<string, boolean> = {};
      setFeatured(prods.filter((p: any) => { if (!p || seen[p.id]) return false; seen[p.id] = true; return true; }));
    }).finally(() => setInitLoading(false));
  }, []);

  const doSearch = useCallback(async (q: string, catId?: string | null) => {
    if (!q.trim() && !catId) { setResults([]); return; }
    setLoading(true);
    try { setResults((await searchProducts(q, catId || undefined, 24)) || []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query, selectedCat), 300);
    return () => clearTimeout(t);
  }, [query, selectedCat, doSearch]);

  const addToBasket = (p: any) => setBasket(prev => prev.find(i => i.id === p.id) ? prev : [...prev, p]);
  const showSearch = query.trim() || selectedCat;
  const display = showSearch ? results : featured;
  const seen2: Record<string, boolean> = {};
  const deduped = display.filter((p: any) => { if (!p || seen2[p.id]) return false; seen2[p.id] = true; return true; });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '40px 20px 32px', maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(108,99,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 100, background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', marginBottom: 20 }}>
            <Zap size={12} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
              {lang === 'ar' ? '٦ متاجر · أسعار مباشرة · عُمان' : '6 stores · Live prices · Muscat'}
            </span>
          </div>

          <h1 className="display animate-fade-up" style={{ fontSize: 'clamp(32px, 8vw, 56px)', marginBottom: 14 }}>
            {lang === 'ar' ? (
              <><span>أسعار البقالة في </span><span className="gradient-text">كل متاجر عُمان</span></>
            ) : (
              <><span>Grocery Prices, </span><span className="gradient-text">Every Store</span></>
            )}
          </h1>

          <p className="animate-fade-up" style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 28, animationDelay: '80ms', fontFamily: AF }}>
            {lang === 'ar' ? 'نفس الماركة · نفس الوزن · أفضل سعر بالريال العُماني' : 'Same brand. Same weight. Best price in OMR — instantly.'}
          </p>

          {/* Search */}
          <div className="animate-fade-up" style={{ position: 'relative', animationDelay: '160ms' }}>
            <Search size={18} style={{ position: 'absolute', [lang === 'ar' ? 'right' : 'left']: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', zIndex: 1 }} />
            <input
              className="input"
              style={{ paddingLeft: lang === 'ar' ? 18 : 48, paddingRight: lang === 'ar' ? 48 : 18, fontSize: 15, height: 52, fontFamily: AF }}
              placeholder={lang === 'ar' ? 'ابحث عن منتج أو ماركة...' : 'Search for milk, rice, chicken...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Store chips */}
          <div className="animate-fade-up stagger" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, animationDelay: '240ms' }}>
            {['Lulu','Carrefour','Sultan','Al Meera','Al Amri'].map(s => (
              <span key={s} className="chip" style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)', fontSize: 11 }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 100px' }}>
        {/* Categories */}
        {categories.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              <button onClick={() => setSelectedCat(null)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 100, border: `1.5px solid ${!selectedCat ? 'var(--accent)' : 'var(--border)'}`, background: !selectedCat ? 'rgba(108,99,255,0.15)' : 'transparent', color: !selectedCat ? 'var(--accent)' : 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: AF }}>
                {lang === 'ar' ? 'الكل' : 'All'}
              </button>
              {categories.map((c: any) => (
                <button key={c.id} onClick={() => setSelectedCat(selectedCat === c.id ? null : c.id)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, border: `1.5px solid ${selectedCat === c.id ? 'var(--accent)' : 'var(--border)'}`, background: selectedCat === c.id ? 'rgba(108,99,255,0.15)' : 'transparent', color: selectedCat === c.id ? 'var(--accent)' : 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: AF }}>
                  {c.icon && <span>{c.icon}</span>}
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Basket bar */}
        {basket.length > 0 && (
          <div className="animate-slide-up" style={{ background: 'linear-gradient(135deg, var(--accent), #a78bfa)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, fontFamily: AF }}>🛒 {basket.length} {lang === 'ar' ? 'منتجات في السلة' : `item${basket.length !== 1 ? 's' : ''} in basket`}</p>
              <p style={{ fontSize: 12, opacity: 0.8, fontFamily: AF }}>{lang === 'ar' ? 'قارن الإجمالي بين المتاجر' : 'Compare total across stores'}</p>
            </div>
            <Link href={`/basket?items=${basket.map(p => p.id).join(',')}`}
              style={{ background: 'white', color: 'var(--accent)', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontFamily: AF }}>
              {lang === 'ar' ? 'عرض' : 'View'} <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="display" style={{ fontSize: 18, fontFamily: AF }}>
            {showSearch ? (loading ? (lang === 'ar' ? 'جارٍ البحث...' : 'Searching...') : `${deduped.length} ${lang === 'ar' ? 'نتيجة' : 'results'}`) : (lang === 'ar' ? 'آخر التحديثات' : 'Recently Updated')}
          </h2>
          {!showSearch && (
            <Link href="/compare" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: AF }}>
              <TrendingDown size={14} /> {lang === 'ar' ? 'قارن' : 'Compare'}
            </Link>
          )}
        </div>

        {/* Grid */}
        {initLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 160 }} />
                <div style={{ padding: 14, background: 'var(--surface)' }}>
                  <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 14, marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 14, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : deduped.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {deduped.map((p: any) => (
              <ProductCard key={p.id} product={p} onAddToBasket={addToBasket} />
            ))}
          </div>
        ) : showSearch ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🔍</p>
            <h3 className="display" style={{ fontSize: 20, marginBottom: 8, fontFamily: AF }}>{lang === 'ar' ? 'لا نتائج' : 'No results'}</h3>
            <p style={{ color: 'var(--muted)', fontFamily: AF }}>{lang === 'ar' ? 'جرّب كلمة أخرى' : 'Try a different search term'}</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="animate-float" style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <h3 className="display" style={{ fontSize: 22, marginBottom: 10, fontFamily: AF }}>{lang === 'ar' ? 'لا توجد منتجات بعد' : 'No products yet'}</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 20, fontFamily: AF }}>{lang === 'ar' ? 'شغّل أداة جمع البيانات لإضافة الأسعار' : 'Run the scraper to start collecting prices'}</p>
            <Link href="/admin" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              {lang === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
