'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';
import { createMobileIntro } from '../lib/mobile-intro';
import { peekHeroSource, pendingHeroSource, prepareHeroSource, restoreHeroSource } from '../lib/hero-source';
const phoneHeroQuery = '(pointer: coarse), (max-width: 900px)';

export function useHeroPlayback() {
  const scene = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const phoneVideo = useRef<HTMLVideoElement>(null);
  const [fallback, setFallback] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = scene.current, film = video.current;
    if (!element || !film) return;
    const phone = window.matchMedia(phoneHeroQuery).matches;
    if (phone && phoneVideo.current) {
      element.dataset.renderer = 'native-mobile';
      let fallbackVersion = 0;
      const mobile = phoneVideo.current;
      const intro = createMobileIntro(mobile, {
        onReady: () => { element.dataset.nativeReady = 'true'; },
        onFallback: () => { setFallback(++fallbackVersion); },
        onState: state => { element.dataset.playback = state; },
      });
      let visible = true;
      const update = () => intro.setActive(visible && !document.hidden);
      const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
      observer.observe(element);
      const hide = () => intro.setActive(false);
      const restore = (event: PageTransitionEvent) => {
        update();
        if (event.persisted) { setFallback(0); intro.restart(); }
      };
      document.addEventListener('visibilitychange', update);
      window.addEventListener('pagehide', hide);
      window.addEventListener('pageshow', restore);
      return () => {
        observer.disconnect(); intro.destroy();
        document.removeEventListener('visibilitychange', update);
        window.removeEventListener('pagehide', hide);
        window.removeEventListener('pageshow', restore);
      };
    }
    element.dataset.renderer = 'video';
    let disposed = false, frame = 0, active: boolean | undefined;
    const cached = peekHeroSource();
    if (cached && film.src !== cached) { film.src = cached; film.load(); }
    const useCompleteSource = (source: Promise<string | undefined>) => {
      void source.then(url => {
        if (disposed || !url || film.src === url) return;
        film.src = url;
        if ('sourceChanged' in playback && typeof playback.sourceChanged === 'function') playback.sourceChanged();
      }).catch(() => { /* Keep streaming and allow the controller to recover. */ });
    };
    let lastProgress = -1;
    const onProgress = (progress: number) => {
      if (progress === lastProgress) return;
      lastProgress = progress;
      element.style.setProperty('--progress', String(progress));
      element.dataset.phase = progress < .25 ? 'grill' : progress < .68 ? 'ingredients' : 'platter';
    };
    const playback = createHeroPlayback(film, {
      onReady: setReady,
      onProgress,
      onStall: () => useCompleteSource(prepareHeroSource()),
      onFrame: time => { element.dataset.frameTime = time.toFixed(3); },
    }, { intro: false });
    {
      // If a desktop window selected no initial source, start its normal video now.
      if (film.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) film.load();
      const pending = pendingHeroSource();
      if (!cached) useCompleteSource(pending ?? restoreHeroSource());
    }
    const updateActivity = () => {
      const bounds = film.getBoundingClientRect();
      const next = !document.hidden && bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (next !== active) { active = next; playback.setActive(next); }
    };
    const measure = () => {
      frame = 0;
      updateActivity();
      const stickyHeight = element.firstElementChild?.getBoundingClientRect().height ?? window.innerHeight;
      const distance = Math.max(1, element.offsetHeight - stickyHeight);
      playback.setProgress(-element.getBoundingClientRect().top / distance);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = scroll;
    const visibility = () => { updateActivity(); if (!document.hidden) measure(); };
    const restore = () => {
      active = undefined;
      updateActivity();
      playback.resumeLoading();
      measure();
      scroll(); // History scroll restoration can happen after pageshow.
    };
    const suspend = () => { active = false; playback.setActive(false); };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('pageshow', restore);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('online', restore);
    document.addEventListener('visibilitychange', visibility);
    // Initialize even at the top and after restored-scroll navigation.
    measure();
    scroll();
    return () => {
      disposed = true;
      playback.destroy();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pageshow', restore);
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('online', restore);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return { scene, video, phoneVideo, ready, fallback };
}
