'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { prepareHeroSource } from '../lib/hero-source';

export function HeroCache() {
  const pathname = usePathname();
  useEffect(() => {
    // Home streams immediately. While browsing another page, finish preparing
    // the complete film so returning home needs no network seeks.
    if (pathname !== '/' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void prepareHeroSource().catch(() => { /* Home retains its streaming source. */ });
    }
  }, [pathname]);
  return null;
}
