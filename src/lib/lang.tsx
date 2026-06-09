'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'en' | 'ar';

interface LangContextType {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  toggle: () => void;
  t: typeof translations['en'];
}

export const translations = {
  en: {
    appName: 'Takhfeed',
    tagline: 'Oman',
    heroTitle1: 'Grocery Prices Across',
    heroTitle2: 'Oman Stores',
    heroSub: 'Same brand · Same weight · Every store · Best price in OMR',
    liveTag: '6 stores · Live prices · Muscat',
    searchPlaceholder: 'Search by name or brand — Almarai, A\'Saffa, Lurpak...',
    allCategories: 'All',
    bestPrice: 'Best Price',
    allStores: 'All stores',
    compareStores: 'Compare stores →',
    navSearch: 'Search',
    navCompare: 'Compare',
    navBasket: 'Basket',
    navAdmin: 'Admin',
    recentlyUpdated: 'Recently Updated',
    noProducts: 'No products yet',
    noProductsSub: 'Run the scraper to start collecting prices.',
    goToAdmin: 'Go to Admin Dashboard',
    basketItems: (n: number) => `${n} item${n !== 1 ? 's' : ''} in basket`,
    basketSub: 'Compare total costs across stores',
    switchLang: 'العربية',
    switchFlag: '🇸🇦',
  },
  ar: {
    appName: 'تخفيض',
    tagline: 'عُمان',
    heroTitle1: 'أسعار البقالة في',
    heroTitle2: 'متاجر عُمان',
    heroSub: 'نفس الماركة · نفس الوزن · كل متجر · أفضل سعر بالريال',
    liveTag: '٦ متاجر · أسعار مباشرة · مسقط',
    searchPlaceholder: 'ابحث بالاسم أو الماركة — المراعي، أصيل، لورباك...',
    allCategories: 'الكل',
    bestPrice: 'أفضل سعر',
    allStores: 'كل المتاجر',
    compareStores: 'قارن المتاجر ←',
    navSearch: 'بحث',
    navCompare: 'مقارنة',
    navBasket: 'السلة',
    navAdmin: 'الإدارة',
    recentlyUpdated: 'آخر التحديثات',
    noProducts: 'لا توجد منتجات',
    noProductsSub: 'شغّل أداة جمع البيانات للبدء.',
    goToAdmin: 'الذهاب للإدارة',
    basketItems: (n: number) => `${n} ${n === 1 ? 'منتج' : 'منتجات'} في السلة`,
    basketSub: 'قارن التكلفة الإجمالية في جميع المتاجر',
    switchLang: 'English',
    switchFlag: '🇬🇧',
  },
};

const LangContext = createContext<LangContextType>({
  lang: 'en',
  dir: 'ltr',
  toggle: () => {},
  t: translations['en'],
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const toggle = () => setLang(l => l === 'en' ? 'ar' : 'en');
  return (
    <LangContext.Provider value={{ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', toggle, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
