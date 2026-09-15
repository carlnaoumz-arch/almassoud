'use client';
import { useEffect } from 'react';
import { prepareHeroSource } from '../lib/hero-source';
import { phoneHeroQuery } from '../lib/hero-frames';

export function HeroCache() {
  useEffect(() => {
    // Home streams immediately. While browsing another page, finish preparing
    // the complete film so returning home needs no network seeks.
    if (window.location.pathname !== '/' && !window.matchMedia(phoneHeroQuery).matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void prepareHeroSource().catch(() => { /* Home retains its streaming source. */ });
    }
  }, []);
  return null;
}
