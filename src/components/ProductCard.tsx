'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Check, TrendingDown } from 'lucide-react';
import { formatOMR, getBestPrice } from '@/lib/supabase';
import { useLang } from '@/lib/lang';

const STORE_CLASS: Record<string, string> = {
  lulu: 'store-lulu', carrefour: 'store-carrefour', sultan: 'store-sultan',
  almeera: 'store-almeera', alamri: 'store-alamri', talabat: 'store-talabat',
};

export default function ProductCard({ product, onAddToBasket }: { product: any; onAddToBasket?: (p: any) => void }) {
  const [added, setAdded] = useState(false);
  const { lang } = useLang();
  const prices = product.product_prices || [];
  const best = getBestPrice(prices);
  const eff = best ? (best.offer_price ?? best.price) : null;
  const hasOffer = best?.offer_price != null && best.offer_price < best.price;
  const savings = hasOffer ? Math.round((1 - best!.offer_price! / best!.price) * 100) : 0;
  const storeId = best?.stores?.slug || 'talabat';

  function handleAdd() {
    if (!onAddToBasket) return;
    onAddToBasket(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="card animate-fade-up" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Image */}
      <div style={{ position: 'relative', height: 160, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize: 48, filter: 'grayscale(0.3)' }}>🛒</span>
        )}
        {hasOffer && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--accent2)', color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 8 }}>
            -{savings}%
          </div>
        )}
        {prices.length > 1 && (
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(8px)', color: 'var(--green)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8 }}>
            <TrendingDown size={10} /> {prices.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {product.categories && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {product.categories.name}
          </span>
        )}
        <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
        {product.size && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{product.size}</span>
        )}

        {/* Price */}
        {eff != null ? (
          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="display gradient-text" style={{ fontSize: 20 }}>{formatOMR(eff)}</span>
              {hasOffer && <span style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through' }}>{formatOMR(best!.price)}</span>}
            </div>
            {best?.stores && (
              <span className={`chip ${STORE_CLASS[storeId] || 'store-talabat'}`} style={{ marginTop: 4 }}>
                {best.stores.name}
              </span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 'auto' }}>No price yet</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Link href={`/compare?q=${encodeURIComponent(product.name)}`}
            style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none', transition: 'all 0.2s' }}>
            Compare
          </Link>
          <button onClick={handleAdd} style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: added ? 'var(--green)' : 'var(--accent)', color: added ? '#000' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
            {added ? <Check size={15} /> : <Plus size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
