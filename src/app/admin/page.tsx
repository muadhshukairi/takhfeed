'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, Activity, Package, Store, List, TrendingUp, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase, getScrapingLogs, getStores, formatOMR } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import { useLang } from '@/lib/lang';

export default function AdminPage() {
  const { lang } = useLang();
  const AF = lang==='ar'?"'Noto Sans Arabic',Tahoma,sans-serif":'inherit';
  const [stats, setStats] = useState({products:0,stores:0,prices:0,categories:0});
  const [logs, setLogs] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<{ok:boolean;msg:string}|null>(null);
  const [tab, setTab] = useState<'overview'|'logs'|'stores'>('overview');

  async function load() {
    setLoading(true);
    try {
      const [{count:pc},{count:sc},{count:prc},{count:cc},logData,storeData] = await Promise.all([
        supabase.from('products').select('*',{count:'exact',head:true}),
        supabase.from('stores').select('*',{count:'exact',head:true}),
        supabase.from('product_prices').select('*',{count:'exact',head:true}),
        supabase.from('categories').select('*',{count:'exact',head:true}),
        getScrapingLogs(30), getStores(),
      ]);
      setStats({products:pc||0,stores:sc||0,prices:prc||0,categories:cc||0});
      setLogs(logData||[]);
      setStores(storeData||[]);
    } finally { setLoading(false); }
  }

  useEffect(()=>{load();},[]);

  async function runScraper() {
    setScraping(true); setResult(null);
    try {
      const r=await fetch('/api/scrape',{method:'POST'});
      const d=await r.json();
      setResult({ok:d.success,msg:d.message});
      if(d.success) setTimeout(load,3000);
    } catch(e:any) { setResult({ok:false,msg:e.message}); }
    finally { setScraping(false); }
  }

  const statCards = [
    {icon:Package, label:lang==='ar'?'المنتجات':'Products', val:stats.products, color:'var(--accent)'},
    {icon:Store,   label:lang==='ar'?'المتاجر':'Stores',    val:stats.stores,   color:'var(--amber)'},
    {icon:TrendingUp, label:lang==='ar'?'الأسعار':'Prices', val:stats.prices,   color:'var(--accent2)'},
    {icon:List,    label:lang==='ar'?'الفئات':'Categories', val:stats.categories,color:'var(--green)'},
  ];

  const formatDate = (d:string) => new Date(d).toLocaleString('en-OM',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  const formatDur = (ms?:number) => !ms?'—':ms<1000?`${ms}ms`:`${(ms/1000).toFixed(1)}s`;

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',direction:lang==='ar'?'rtl':'ltr'}}>
      <Navbar/>
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 16px 100px'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:24,flexWrap:'wrap'}}>
          <div>
            <h1 className="display animate-fade-up" style={{fontSize:28,marginBottom:4,fontFamily:AF}}>{lang==='ar'?'لوحة الإدارة':'Admin Dashboard'}</h1>
            <p className="animate-fade-up" style={{color:'var(--muted)',fontSize:14,fontFamily:AF,animationDelay:'80ms'}}>{lang==='ar'?'مراقبة جمع البيانات وإدارة المتاجر':'Monitor scrapers and manage store data'}</p>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={load} disabled={loading} className="btn btn-ghost" style={{fontFamily:AF}}>
              <RefreshCw size={14} style={{animation:loading?'spin 1s linear infinite':undefined}}/> {lang==='ar'?'تحديث':'Refresh'}
            </button>
            <button onClick={runScraper} disabled={scraping} className="btn btn-primary" style={{fontFamily:AF}}>
              <Activity size={14} style={{animation:scraping?'pulse 1s infinite':undefined}}/> {scraping?(lang==='ar'?'جارٍ...':'Running...'):(lang==='ar'?'تشغيل':'Run Scraper')}
            </button>
          </div>
        </div>

        {result&&(
          <div className="animate-scale-in" style={{marginBottom:16,padding:'12px 16px',borderRadius:12,background:result.ok?'rgba(0,214,143,0.1)':'rgba(255,107,107,0.1)',border:`1px solid ${result.ok?'rgba(0,214,143,0.3)':'rgba(255,107,107,0.3)'}`,display:'flex',alignItems:'center',gap:8}}>
            {result.ok?<CheckCircle size={15} style={{color:'var(--green)'}}/>:<XCircle size={15} style={{color:'var(--accent2)'}}/>}
            <p style={{fontSize:13,color:result.ok?'var(--green)':'var(--accent2)',fontFamily:AF}}>{result.msg}</p>
          </div>
        )}

        {/* Stat cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:20}}>
          {statCards.map(({icon:Icon,label,val,color})=>(
            <div key={label} className="card animate-fade-up" style={{padding:'16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:32,height:32,borderRadius:10,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Icon size={15} style={{color}}/>
                </div>
                <span style={{fontSize:12,color:'var(--muted)',fontFamily:AF}}>{label}</span>
              </div>
              <p className="display" style={{fontSize:26}}>{loading?'—':val.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,background:'var(--surface)',borderRadius:12,padding:4,marginBottom:16,border:'1px solid var(--border)'}}>
          {(['overview','logs','stores'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'8px',borderRadius:9,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,textTransform:'capitalize',background:tab===t?'var(--surface2)':'transparent',color:tab===t?'var(--accent)':'var(--muted)',transition:'all 0.2s',fontFamily:AF}}>
              {lang==='ar'?{overview:'نظرة عامة',logs:'السجلات',stores:'المتاجر'}[t]:t}
            </button>
          ))}
        </div>

        {/* Tab: overview */}
        {tab==='overview'&&(
          <div className="card animate-fade-in" style={{padding:20}}>
            <h3 className="display" style={{fontSize:16,marginBottom:16,fontFamily:AF}}>⚙️ {lang==='ar'?'خطوات البدء':'Setup Steps'}</h3>
            {(lang==='ar'?['شغّل schema.sql في Supabase SQL Editor','أضف مفاتيح Supabase في .env.local','ثبّت متصفح Playwright: npx playwright install chromium','شغّل أداة الجمع: npm run scrape','أضف متاجر في scripts/scraper.ts']:
              ['Run supabase/schema.sql in Supabase SQL Editor','Add Supabase keys to .env.local','Install Playwright: npx playwright install chromium','Run scraper: npm run scrape','Add more stores in scripts/scraper.ts']).map((s,i)=>(
              <div key={i} style={{display:'flex',gap:10,marginBottom:14}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'var(--accent)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</div>
                <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.5,fontFamily:AF}}>{s}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab: logs */}
        {tab==='logs'&&(
          <div className="card animate-fade-in" style={{overflow:'hidden'}}>
            {logs.length===0?(
              <div style={{padding:'40px 20px',textAlign:'center'}}>
                <Activity size={32} style={{color:'var(--muted)',opacity:0.3,margin:'0 auto 10px'}}/>
                <p style={{color:'var(--muted)',fontFamily:AF}}>{lang==='ar'?'لا توجد سجلات':'No logs yet'}</p>
              </div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{borderBottom:'1px solid var(--border)',background:'var(--surface2)'}}>
                    {['Status','Store','Products','Errors','Duration','Time'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',color:'var(--muted)',fontWeight:600}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {logs.map((log:any,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'10px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            {log.status==='success'?<CheckCircle size={13} style={{color:'var(--green)'}}/>:log.status==='partial'?<AlertCircle size={13} style={{color:'var(--amber)'}}/>:<XCircle size={13} style={{color:'var(--accent2)'}}/>}
                            <span style={{textTransform:'capitalize',fontWeight:600,color:log.status==='success'?'var(--green)':log.status==='partial'?'var(--amber)':'var(--accent2)'}}>{log.status}</span>
                          </div>
                        </td>
                        <td style={{padding:'10px 14px',color:'var(--muted)'}}>{log.stores?.name||'—'}</td>
                        <td style={{padding:'10px 14px'}}>{log.products_scraped}</td>
                        <td style={{padding:'10px 14px',color:log.errors_count>0?'var(--accent2)':undefined}}>{log.errors_count}</td>
                        <td style={{padding:'10px 14px',color:'var(--muted)'}}>{formatDur(log.duration_ms)}</td>
                        <td style={{padding:'10px 14px',color:'var(--muted)',whiteSpace:'nowrap'}}>{formatDate(log.started_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: stores */}
        {tab==='stores'&&(
          <div className="card animate-fade-in" style={{overflow:'hidden'}}>
            {stores.length===0?(
              <div style={{padding:'40px 20px',textAlign:'center'}}>
                <Store size={32} style={{color:'var(--muted)',opacity:0.3,margin:'0 auto 10px'}}/>
                <p style={{color:'var(--muted)',fontFamily:AF}}>{lang==='ar'?'لا توجد متاجر':'No stores yet'}</p>
              </div>
            ):stores.map((store:any,i)=>(
              <div key={store.id} style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:36,height:36,borderRadius:10,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Store size={16} style={{color:'var(--muted)'}}/>
                </div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,fontSize:14,marginBottom:4,fontFamily:AF}}>{store.name}</p>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    {store.delivery_fee!=null&&<span style={{fontSize:11,color:'var(--muted)'}}>🚚 {formatOMR(store.delivery_fee)}</span>}
                    {store.min_order!=null&&<span style={{fontSize:11,color:'var(--muted)'}}>📦 Min {formatOMR(store.min_order)}</span>}
                    {store.delivery_time_min&&<span style={{fontSize:11,color:'var(--muted)'}}>⏱ {store.delivery_time_min}–{store.delivery_time_max}min</span>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:store.is_active?'var(--green)':'var(--accent2)'}}/>
                  <span style={{fontSize:11,color:store.is_active?'var(--green)':'var(--accent2)',fontWeight:600,fontFamily:AF}}>{store.is_active?(lang==='ar'?'نشط':'Active'):(lang==='ar'?'معطّل':'Off')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
