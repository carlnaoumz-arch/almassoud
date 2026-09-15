'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';
import { peekHeroSource, pendingHeroSource, prepareHeroSource, restoreHeroSource } from '../lib/hero-source';

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
    let disposed = false, frame = 0, active: boolean | undefined;
    const cached = peekHeroSource();
    if (cached && film.src !== cached) { film.src = cached; film.load(); }
    const useCompleteSource = (source: Promise<string | undefined>) => {
      void source.then(url => {
        if (disposed || !url || film.src === url) return;
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
      onFrame: time => { element.dataset.frameTime = time.toFixed(3); },
    }, { reducedMotion: media.matches });
    controller.current = playback;
    const pending = pendingHeroSource();
    if (!cached) useCompleteSource(pending ?? restoreHeroSource());
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
    const visibility = () => { updateActivity(); if (!document.hidden) measure(); };
    const preference = () => playback.setReducedMotion(media.matches);
    const restore = () => {
      active = undefined;
      updateActivity();
      playback.resumeLoading();
      measure();
      scroll(); // History scroll restoration can happen after pageshow.
    };
    const suspend = () => { active = false; playback.setActive(false); };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    window.addEventListener('pageshow', restore);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('online', restore);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', preference);
    // Initialize even at the top and after restored-scroll navigation.
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
