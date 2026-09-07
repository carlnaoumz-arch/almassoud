'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';
import { getCompleteHeroVideo, HERO_VIDEO_URL } from '../lib/hero-source';

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
    let disposed = false, objectUrl: string | undefined, loading = false;
    let sourceRetry = 0, sourceAttempts = 0;
    const loadCompleteSource = async () => {
      if (loading || objectUrl || disposed) return;
      loading = true;
      sourceAttempts++;
      try {
        const completeFile = await getCompleteHeroVideo();
        if (disposed) return;
        objectUrl = URL.createObjectURL(completeFile);
        film.src = objectUrl;
        film.load();
        playback.refresh();
      } catch {
        // Allow a transient first-request/auth/network failure to recover without refreshing.
        if (!disposed && sourceAttempts < 3) sourceRetry = window.setTimeout(() => {
          sourceRetry = 0;
          void loadCompleteSource();
        }, 1500 * sourceAttempts);
      } finally { loading = false; }
    };
    const sourceError = () => {
      if (objectUrl && film.error?.code === 4 && film.src.startsWith('blob:')) {
        // If a browser policy forbids blob media, the exact complete HTTP response is cached.
        film.src = HERO_VIDEO_URL;
        film.load();
      }
    };
    film.addEventListener('error', sourceError);
    void loadCompleteSource();
    let frame = 0;
    const measure = () => {
      frame = 0;
      const distance = Math.max(1, element.offsetHeight - window.innerHeight);
      playback.setProgress(-element.getBoundingClientRect().top / distance);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const visibility = () => { playback.setActive(!document.hidden); if (!document.hidden) measure(); };
    const preference = () => playback.setReducedMotion(media.matches);
    const restore = () => { void loadCompleteSource(); playback.resumeLoading(); measure(); };
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
      window.clearTimeout(sourceRetry);
      playback.destroy();
      film.removeEventListener('error', sourceError);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
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
