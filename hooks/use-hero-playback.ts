'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';

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
    const playback = createHeroPlayback(film, {
      onReady: setReady,
      onProgress: progress => {
        element.style.setProperty('--progress', String(progress));
        element.dataset.phase = progress < .25 ? 'grill' : progress < .68 ? 'ingredients' : 'platter';
      },
    }, { reducedMotion: media.matches });
    controller.current = playback;
    let disposed = false;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const distance = Math.max(1, element.offsetHeight - window.innerHeight);
      playback.setProgress(-element.getBoundingClientRect().top / distance);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const visibility = () => { playback.setActive(!document.hidden); if (!document.hidden) measure(); };
    const preference = () => playback.setReducedMotion(media.matches);
    const restore = () => { playback.resumeLoading(); measure(); };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    window.addEventListener('pageshow', restore);
    window.addEventListener('online', restore);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', preference);
    // Initialize even at the top and after restored-scroll navigation.
    measure();
    return () => {
      disposed = true;
      playback.destroy();
      controller.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scroll);
      window.removeEventListener('pageshow', restore);
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
