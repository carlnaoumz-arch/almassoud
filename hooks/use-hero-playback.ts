'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';
import { peekHeroSource, pendingHeroSource, prepareHeroSource } from '../lib/hero-source';

export function useHeroPlayback() {
  const scene = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const controller = useRef<ReturnType<typeof createHeroPlayback> | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = scene.current, film = video.current;
    if (!element || !film) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, frame = 0;
    const cached = peekHeroSource();
    if (cached && film.src !== cached) { film.src = cached; film.load(); }
    const useCompleteSource = (source: Promise<string>) => {
      void source.then(url => {
        if (disposed || film.src === url) return;
        film.src = url;
        playback.sourceChanged();
      }).catch(() => { /* Keep streaming and allow the controller to recover. */ });
    };
    const playback = createHeroPlayback(film, {
      onReady: setReady,
      onProgress: progress => {
        element.style.setProperty('--progress', String(progress));
        element.dataset.phase = progress < .25 ? 'grill' : progress < .68 ? 'ingredients' : 'platter';
      },
      onStall: () => useCompleteSource(prepareHeroSource()),
    }, { reducedMotion: media.matches });
    controller.current = playback;
    const pending = pendingHeroSource();
    if (!cached && pending) useCompleteSource(pending);
    const measure = () => {
      frame = 0;
      const stickyHeight = element.firstElementChild?.getBoundingClientRect().height ?? window.innerHeight;
      const distance = Math.max(1, element.offsetHeight - stickyHeight);
      playback.setProgress(-element.getBoundingClientRect().top / distance);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const visibility = () => { playback.setActive(!document.hidden); if (!document.hidden) measure(); };
    const preference = () => playback.setReducedMotion(media.matches);
    const restore = () => {
      playback.setActive(!document.hidden);
      playback.resumeLoading();
      measure();
      scroll(); // History scroll restoration can happen after pageshow.
    };
    const suspend = () => playback.setActive(false);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    window.addEventListener('pageshow', restore);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('online', restore);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', preference);
    // Initialize even at the top and after restored-scroll navigation.
    playback.setActive(!document.hidden);
    measure();
    scroll();
    return () => {
      disposed = true;
      playback.destroy();
      controller.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scroll);
      window.removeEventListener('pageshow', restore);
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('online', restore);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', preference);
    };
  }, []);

  function toggleMotion() {
    const next = !paused;
    setPaused(next);
    controller.current?.setPaused(next);
  }
  return { scene, video, ready, paused, toggleMotion };
}
