'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, BarChart3, ShoppingCart, Shield } from 'lucide-react';
import { useLang } from '@/lib/lang';

export default function Navbar() {
  const pathname = usePathname();
  const { t, lang, toggle } = useLang();

  const links = [
    { href: '/',        label: t.navSearch,  Icon: Search },
    { href: '/compare', label: t.navCompare, Icon: BarChart3 },
    { href: '/basket',  label: t.navBasket,  Icon: ShoppingCart },
    { href: '/admin',   label: t.navAdmin,   Icon: Shield },
  ];

  return (
    <>
      {/* Desktop top nav */}
      <header className="top-nav hidden md:block">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16, fontFamily: 'Syne' }}>T</span>
            </div>
            <span className="display" style={{ fontSize: 18, color: 'var(--text)' }}>
              Takhfeed
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {links.map(({ href, label, Icon }) => (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                background: pathname === href ? 'var(--surface2)' : 'transparent',
                color: pathname === href ? 'var(--accent)' : 'var(--muted)',
                transition: 'all 0.2s',
                fontFamily: lang === 'ar' ? 'Noto Sans Arabic, Tahoma' : 'inherit',
              }}>
                <Icon size={14} />
                {label}
              </Link>
            ))}
            <button onClick={toggle} style={{
              marginLeft: 8, padding: '7px 14px', borderRadius: 10,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: lang === 'ar' ? 'Syne' : 'Noto Sans Arabic, Tahoma',
            }}>
              {lang === 'en' ? '🇸🇦 AR' : '🇬🇧 EN'}
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav md:hidden">
        {links.map(({ href, label, Icon }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className={`bottom-nav-item ${pathname === href ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
              <div className="nav-dot" />
            </div>
          </Link>
        ))}
        <button className="bottom-nav-item" onClick={toggle}>
          <span style={{ fontSize: 20 }}>{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
          <span>{lang === 'en' ? 'AR' : 'EN'}</span>
          <div className="nav-dot" />
        </button>
      </nav>
    </>
  );
}
