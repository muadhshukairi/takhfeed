'use client';
import { useState, useEffect, Suspense } from 'react';
import { Trash2, Plus, ShoppingCart, TrendingDown, Search } from 'lucide-react';
import { searchProducts, getStores, formatOMR } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { useLang } from '@/lib/lang';

const STORE_CLASS: Record<string,string> = {lulu:'store-lulu',carrefour:'store-carrefour',sultan:'store-sultan',almeera:'store-almeera',alamri:'store-alamri',talabat:'store-talabat'};

function BasketContent() {
  const { lang } = useLang();
  const AF = lang==='ar'?"'Noto Sans Arabic',Tahoma,sans-serif":'inherit';
  const [basket, setBasket] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [addQ, setAddQ] = useState('');
  const [addRes, setAddRes] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { getStores().then(s => setStores(s||[])); }, []);

  useEffect(() => {
    if (!addQ.trim()) { setAddRes([]); return; }
    const t = setTimeout(async()=>{
      setSearching(true);
      try { setAddRes((await searchProducts(addQ,undefined,8))||[]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [addQ]);

  const updQty = (id:string, qty:number) => {
    if (qty<1) { setBasket(p=>p.filter(i=>i.product.id!==id)); return; }
    setBasket(p=>p.map(i=>i.product.id===id?{...i,qty}:i));
  };

  const totals = stores.map(store=>{
    let total=0,avail=0,missing=0;
    basket.forEach(({product,qty})=>{
      const pp=(product.product_prices||[]).find((p:any)=>p.store_id===store.id);
      if(pp){total+=(pp.offer_price??pp.price)*qty;avail++;}else missing++;
    });
    return{store,total,avail,missing};
  }).sort((a,b)=>a.total-b.total);

  const active=totals.filter(t=>t.avail>0);
  const savings=active.length>=2?active[active.length-1].total-active[0].total:0;

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',direction:lang==='ar'?'rtl':'ltr'}}>
      <Navbar/>
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 16px 100px'}}>
        <h1 className="display animate-fade-up" style={{fontSize:28,marginBottom:6,fontFamily:AF}}>
          {lang==='ar'?'مقارنة السلة':'Basket Comparison'}
        </h1>
        <p className="animate-fade-up" style={{color:'var(--muted)',marginBottom:24,fontSize:14,fontFamily:AF,animationDelay:'80ms'}}>
          {lang==='ar'?'أضف منتجاتك واعرف أرخص متجر':'Add items and find the cheapest store for your whole list'}
        </p>

        <div style={{display:'grid',gap:16,gridTemplateColumns:'1fr'}}>
          {/* Add item */}
          <div className="card animate-fade-up" style={{padding:16,animationDelay:'160ms'}}>
            <button onClick={()=>setShowAdd(!showAdd)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,background:'transparent',border:'none',color:'var(--accent)',fontWeight:600,cursor:'pointer',fontSize:14,fontFamily:AF}}>
              <Plus size={16}/> {lang==='ar'?'أضف منتجاً':'Add item'}
            </button>
            {showAdd&&(
              <div style={{marginTop:12}}>
                <div style={{position:'relative',marginBottom:8}}>
                  <Search size={14} style={{position:'absolute',[lang==='ar'?'right':'left']:12,top:'50%',transform:'translateY(-50%)',color:'var(--muted)'}}/>
                  <input className="input" style={{[lang==='ar'?'paddingRight':'paddingLeft']:38,fontSize:13,height:40,fontFamily:AF}}
                    placeholder={lang==='ar'?'ابحث...':'Search products...'} value={addQ} onChange={e=>setAddQ(e.target.value)} autoFocus/>
                </div>
                {searching&&<p style={{fontSize:12,color:'var(--muted)',fontFamily:AF}}>{lang==='ar'?'جارٍ البحث...':'Searching...'}</p>}
                {addRes.length>0&&(
                  <div style={{border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
                    {addRes.map((p:any)=>{
                      const prices=p.product_prices||[];
                      const best=prices.length?Math.min(...prices.map((pp:any)=>pp.offer_price??pp.price)):null;
                      return(
                        <button key={p.id} onClick={()=>{setBasket(prev=>prev.find(i=>i.product.id===p.id)?prev:[...prev,{product:p,qty:1}]);setAddQ('');setAddRes([]);setShowAdd(false);}}
                          style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'transparent',border:'none',borderBottom:'1px solid var(--border)',cursor:'pointer',color:'var(--text)',textAlign:lang==='ar'?'right':'left'}}>
                          {p.image_url&&<img src={p.image_url} alt="" style={{width:36,height:36,objectFit:'contain',borderRadius:8,background:'var(--surface2)',flexShrink:0}}/>}
                          <div style={{flex:1,minWidth:0,textAlign:lang==='ar'?'right':'left'}}>
                            <p style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:AF}}>{p.name}</p>
                            {p.size&&<p style={{fontSize:11,color:'var(--muted)'}}>{p.size}</p>}
                          </div>
                          {best!=null&&<span style={{fontFamily:'Syne',fontWeight:700,color:'var(--green)',flexShrink:0}}>{formatOMR(best)}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:16}}>
            {/* Basket items */}
            {basket.length===0?(
              <div className="card" style={{padding:'48px 20px',textAlign:'center'}}>
                <ShoppingCart size={40} style={{color:'var(--muted)',opacity:0.4,margin:'0 auto 12px'}}/>
                <p className="display" style={{fontSize:18,marginBottom:6,fontFamily:AF}}>{lang==='ar'?'السلة فارغة':'Basket is empty'}</p>
                <p style={{color:'var(--muted)',fontSize:13,fontFamily:AF}}>{lang==='ar'?'اضغط + لإضافة منتجات':'Tap + to add products'}</p>
              </div>
            ):(
              <div className="card" style={{overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <p style={{fontWeight:700,fontSize:14,fontFamily:AF}}>🛒 {basket.length} {lang==='ar'?'منتجات':'items'}</p>
                </div>
                {basket.map(({product,qty})=>{
                  const prices=product.product_prices||[];
                  const sorted=[...prices].sort((a:any,b:any)=>(a.offer_price??a.price)-(b.offer_price??b.price));
                  const best=sorted[0];
                  const eff=best?best.offer_price??best.price:null;
                  return(
                    <div key={product.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                      {product.image_url&&<img src={product.image_url} alt="" style={{width:44,height:44,objectFit:'contain',borderRadius:10,background:'var(--surface2)',flexShrink:0,padding:4}}/>}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:AF}}>{product.name}</p>
                        {product.size&&<p style={{fontSize:11,color:'var(--muted)'}}>{product.size}</p>}
                        {eff!=null&&best?.stores&&<p style={{fontSize:11,color:'var(--green)',fontWeight:600,marginTop:2}}>{formatOMR(eff)} @ {best.stores.name}</p>}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                        <button onClick={()=>updQty(product.id,qty-1)} style={{width:28,height:28,borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text)',cursor:'pointer',fontWeight:700,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                        <span style={{fontWeight:700,minWidth:20,textAlign:'center'}}>{qty}</span>
                        <button onClick={()=>updQty(product.id,qty+1)} style={{width:28,height:28,borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text)',cursor:'pointer',fontWeight:700,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                      </div>
                      <button onClick={()=>updQty(product.id,0)} style={{padding:6,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',color:'var(--accent2)',display:'flex',flexShrink:0}}>
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Store totals */}
            {active.length>0&&(
              <>
                {savings>0.001&&(
                  <div style={{background:'linear-gradient(135deg,rgba(0,214,143,0.15),rgba(0,214,143,0.05))',border:'1px solid rgba(0,214,143,0.25)',borderRadius:16,padding:'18px 20px'}} className="animate-scale-in">
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <TrendingDown size={16} style={{color:'var(--green)'}}/>
                      <p style={{fontSize:12,color:'var(--muted)',fontFamily:AF}}>{lang==='ar'?'يمكنك توفير':'You can save'}</p>
                    </div>
                    <p style={{fontFamily:'Syne',fontSize:32,fontWeight:900,color:'var(--green)'}}>{formatOMR(savings)}</p>
                    <p style={{fontSize:12,color:'var(--muted)',marginTop:4,fontFamily:AF}}>
                      {lang==='ar'?`باختيار ${active[0]?.store.name} بدلاً من ${active[active.length-1]?.store.name}`:`by choosing ${active[0]?.store.name} over ${active[active.length-1]?.store.name}`}
                    </p>
                  </div>
                )}
                <div className="card" style={{overflow:'hidden'}}>
                  <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                    <p style={{fontWeight:700,fontSize:14,fontFamily:AF}}>{lang==='ar'?'المتاجر مرتبة':'Stores Ranked'}</p>
                  </div>
                  {active.map(({store,total,avail,missing},idx)=>{
                    const isBest=idx===0,isWorst=idx===active.length-1;
                    const maxT=Math.max(...active.map(s=>s.total));
                    const pct=maxT>0?(total/maxT)*100:100;
                    const storeId=store.slug||'talabat';
                    return(
                      <div key={store.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:isBest?'rgba(0,214,143,0.04)':'transparent'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,gap:10}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:22,height:22,borderRadius:'50%',background:isBest?'var(--green)':isWorst?'rgba(255,107,107,0.2)':'var(--surface2)',color:isBest?'#000':isWorst?'var(--accent2)':'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0}}>{idx+1}</div>
                            <span className={`chip ${STORE_CLASS[storeId]||'store-talabat'}`}>{store.name}</span>
                          </div>
                          <span style={{fontFamily:'Syne',fontWeight:800,fontSize:16,color:isBest?'var(--green)':isWorst?'var(--accent2)':'var(--text)'}}>{formatOMR(total)}</span>
                        </div>
                        <div className="price-bar-track">
                          <div className="price-bar-fill" style={{width:`${pct}%`,background:isBest?'var(--green)':isWorst?'var(--accent2)':'var(--accent)'}}/>
                        </div>
                        <div style={{display:'flex',gap:10,marginTop:6}}>
                          <span style={{fontSize:10,color:'var(--green)',fontFamily:AF}}>✓ {avail} {lang==='ar'?'متوفر':'items'}</span>
                          {missing>0&&<span style={{fontSize:10,color:'var(--accent2)',fontFamily:AF}}>✗ {missing} {lang==='ar'?'غير متوفر':'missing'}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BasketPage() {
  return <Suspense fallback={<div style={{minHeight:'100vh',background:'var(--bg)'}}/>}><BasketContent/></Suspense>;
}
