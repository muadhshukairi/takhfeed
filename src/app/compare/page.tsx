'use client';
import { useState, useCallback, Suspense } from 'react';
import { Search, TrendingDown, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { searchProducts, formatOMR } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { useLang } from '@/lib/lang';
import { useSearchParams } from 'next/navigation';

const STORE_CLASS: Record<string,string> = {lulu:'store-lulu',carrefour:'store-carrefour',sultan:'store-sultan',almeera:'store-almeera',alamri:'store-alamri',talabat:'store-talabat'};

function CompareContent() {
  const params = useSearchParams();
  const { lang } = useLang();
  const AF = lang==='ar' ? "'Noto Sans Arabic',Tahoma,sans-serif" : 'inherit';
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const doSearch = useCallback(async (q:string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try { setResults((await searchProducts(q,undefined,30))||[]); }
    finally { setLoading(false); }
  }, []);

  useState(() => { if (params.get('q')) doSearch(params.get('q')!); });

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',direction:lang==='ar'?'rtl':'ltr'}}>
      <Navbar/>
      <div style={{maxWidth:800,margin:'0 auto',padding:'24px 16px 100px'}}>
        <h1 className="display animate-fade-up" style={{fontSize:28,marginBottom:6,fontFamily:AF}}>
          {lang==='ar'?'مقارنة الأسعار':'Price Comparison'}
        </h1>
        <p className="animate-fade-up" style={{color:'var(--muted)',marginBottom:24,fontSize:14,fontFamily:AF,animationDelay:'80ms'}}>
          {lang==='ar'?'نفس المنتج، كل المتاجر، مرتبة من الأرخص':'Same product, every store, ranked cheapest first'}
        </p>

        <div className="animate-fade-up" style={{position:'relative',marginBottom:24,animationDelay:'160ms'}}>
          <Search size={16} style={{position:'absolute',[lang==='ar'?'right':'left']:16,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
          <input className="input" style={{[lang==='ar'?'paddingRight':'paddingLeft']:48,fontFamily:AF}}
            placeholder={lang==='ar'?'ابحث عن منتج...':'Search product to compare...'}
            value={query} onChange={e=>{setQuery(e.target.value);doSearch(e.target.value);}}/>
        </div>

        {loading ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:120,borderRadius:16}}/>)}
          </div>
        ) : results.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {results.map((product:any) => {
              const prices=(product.product_prices||[]).filter((p:any)=>p.stores);
              if(!prices.length) return null;
              const sorted=[...prices].sort((a:any,b:any)=>(a.offer_price??a.price)-(b.offer_price??b.price));
              const maxP=Math.max(...sorted.map((p:any)=>p.offer_price??p.price));
              const minP=sorted[0].offer_price??sorted[0].price;
              const maxAbsP=sorted[sorted.length-1].offer_price??sorted[sorted.length-1].price;
              const savings=maxAbsP-minP;
              const isExp=expanded.has(product.id);
              const display=isExp?sorted:sorted.slice(0,3);

              return (
                <div key={product.id} className="card animate-fade-up" style={{overflow:'hidden'}}>
                  {/* Header */}
                  <div style={{padding:'16px 18px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'center'}}>
                    {product.image_url&&<img src={product.image_url} alt="" style={{width:52,height:52,objectFit:'contain',borderRadius:10,background:'var(--surface2)',padding:4,flexShrink:0}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:700,fontSize:14,marginBottom:4,fontFamily:AF}}>{product.name}</p>
                      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                        {product.size&&<span style={{fontSize:11,background:'rgba(0,214,143,0.1)',color:'var(--green)',padding:'2px 8px',borderRadius:6,fontWeight:700}}>{product.size}</span>}
                        <span style={{fontSize:11,color:'var(--muted)',fontFamily:AF}}>{prices.length} {lang==='ar'?'متاجر':'stores'}</span>
                      </div>
                    </div>
                    {savings>0.001&&(
                      <div style={{textAlign:'center',flexShrink:0,background:'rgba(0,214,143,0.08)',border:'1px solid rgba(0,214,143,0.2)',borderRadius:12,padding:'8px 12px'}}>
                        <p style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,marginBottom:2,fontFamily:AF}}>{lang==='ar'?'وفّر':'Save'}</p>
                        <p style={{fontSize:15,fontWeight:800,color:'var(--green)',fontFamily:'Syne'}}>{formatOMR(savings)}</p>
                      </div>
                    )}
                  </div>

                  {/* Price rows */}
                  {display.map((pp:any,idx:number)=>{
                    const eff=pp.offer_price??pp.price;
                    const pct=maxP>0?(eff/maxP)*100:100;
                    const isBest=idx===0;
                    const isWorst=idx===sorted.length-1&&sorted.length>1;
                    const storeId=pp.stores?.slug||'talabat';
                    return (
                      <div key={pp.id} style={{padding:'12px 18px',background:isBest?'rgba(0,214,143,0.04)':'transparent',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:22,height:22,borderRadius:'50%',background:isBest?'var(--green)':isWorst?'rgba(255,107,107,0.2)':'var(--surface2)',color:isBest?'#000':isWorst?'var(--accent2)':'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0}}>{idx+1}</div>
                        <div style={{width:140,flexShrink:0}}>
                          <span className={`chip ${STORE_CLASS[storeId]||'store-talabat'}`}>{pp.stores?.name}</span>
                        </div>
                        <div style={{flex:1}}>
                          <div className="price-bar-track">
                            <div className="price-bar-fill" style={{width:`${pct}%`,background:isBest?'var(--green)':isWorst?'var(--accent2)':'var(--accent)'}}/>
                          </div>
                        </div>
                        <div style={{textAlign:lang==='ar'?'left':'right',flexShrink:0,minWidth:80}}>
                          <p style={{fontFamily:'Syne',fontWeight:800,fontSize:15,color:isBest?'var(--green)':isWorst?'var(--accent2)':'var(--text)'}}>{formatOMR(eff)}</p>
                          {pp.offer_price&&<p style={{fontSize:10,color:'var(--muted)',textDecoration:'line-through'}}>{formatOMR(pp.price)}</p>}
                        </div>
                        {isBest&&<span style={{background:'var(--green)',color:'#000',fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:100,flexShrink:0,fontFamily:AF}}>{lang==='ar'?'أفضل':'BEST'}</span>}
                        {isWorst&&sorted.length>1&&<span style={{background:'rgba(255,107,107,0.15)',color:'var(--accent2)',fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:100,flexShrink:0,fontFamily:AF}}>{lang==='ar'?'أغلى':'HIGH'}</span>}
                        {pp.product_url&&<a href={pp.product_url} target="_blank" rel="noopener noreferrer" style={{color:'var(--muted)',flexShrink:0,display:'flex'}}><ExternalLink size={13}/></a>}
                      </div>
                    );
                  })}

                  {sorted.length>3&&(
                    <button onClick={()=>setExpanded(p=>{const n=new Set(p);n.has(product.id)?n.delete(product.id):n.add(product.id);return n;})}
                      style={{width:'100%',padding:'10px',background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:4,fontFamily:AF}}>
                      {isExp?<><ChevronUp size={13}/>{lang==='ar'?'أقل':'Less'}</>:<><ChevronDown size={13}/>{lang==='ar'?`${sorted.length-3} متاجر أخرى`:`${sorted.length-3} more stores`}</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : query.trim() ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <p style={{fontSize:48,marginBottom:12}}>🔍</p>
            <p className="display" style={{fontSize:18,fontFamily:AF}}>{lang==='ar'?`لا نتائج لـ "${query}"`:`No results for "${query}"`}</p>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div className="animate-float" style={{fontSize:64,marginBottom:16}}>📊</div>
            <p className="display" style={{fontSize:20,marginBottom:8,fontFamily:AF}}>{lang==='ar'?'ابدأ المقارنة':'Start comparing'}</p>
            <p style={{color:'var(--muted)',fontFamily:AF}}>{lang==='ar'?'ابحث عن أي منتج لمقارنة الأسعار':'Search any product to compare prices'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return <Suspense fallback={<div style={{minHeight:'100vh',background:'var(--bg)'}}/>}><CompareContent/></Suspense>;
}
