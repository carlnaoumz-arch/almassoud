'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';
import { peekHeroSource, pendingHeroSource, prepareHeroSource, restoreHeroSource } from '../lib/hero-source';
import { createHeroFrames, loadHeroFrame, phoneHeroQuery } from '../lib/hero-frames';

export function useHeroPlayback() {
  const scene = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ReturnType<typeof createHeroPlayback> | ReturnType<typeof createHeroFrames> | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const reducedPreference = useRef(false);

  useEffect(() => {
    const element = scene.current, film = video.current;
    if (!element || !film) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedPreference.current = media.matches;
    setReduced(media.matches);
    const phone = window.matchMedia(phoneHeroQuery).matches;
    const surface = canvas.current;
    const context = phone ? surface?.getContext('2d', { alpha: false }) : null;
    const frames = Boolean(phone && surface && context);
    element.dataset.renderer = frames ? 'frames' : 'video';
    let disposed = false, frame = 0, active: boolean | undefined;
    const cached = frames ? undefined : peekHeroSource();
    if (cached && film.src !== cached) { film.src = cached; film.load(); }
    const useCompleteSource = (source: Promise<string | undefined>) => {
      void source.then(url => {
        if (disposed || !url || film.src === url) return;
        film.src = url;
        if ('sourceChanged' in playback && typeof playback.sourceChanged === 'function') playback.sourceChanged();
      }).catch(() => { /* Keep streaming and allow the controller to recover. */ });
    };
    const onProgress = (progress: number) => {
        element.style.setProperty('--progress', String(progress));
        element.dataset.phase = progress < .25 ? 'grill' : progress < .68 ? 'ingredients' : 'platter';
    };
    const playback = frames ? createHeroFrames(loadHeroFrame, {
      onProgress,
      draw: (asset, index) => {
        context!.drawImage(asset.image, 0, 0, 1920, 1080);
        element.dataset.frameTime = ((29 + index) / 24).toFixed(3);
        setReady(true);
      },
    }, { reducedMotion: media.matches }) : createHeroPlayback(film, {
      onReady: setReady,
      onProgress,
      onStall: () => useCompleteSource(prepareHeroSource()),
      onFrame: time => { element.dataset.frameTime = time.toFixed(3); },
    }, { reducedMotion: media.matches });
    controller.current = playback;
    if (frames) { film.pause(); }
    else {
      // If a desktop window selected no initial source, start its normal video now.
      if (film.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) film.load();
      const pending = pendingHeroSource();
      if (!cached) useCompleteSource(pending ?? restoreHeroSource());
    }
    const updateActivity = () => {
      const bounds = (frames ? surface! : film).getBoundingClientRect();
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
    const preference = () => {
      reducedPreference.current = media.matches;
      setReduced(media.matches);
      delete element.dataset.motionOverride;
      playback.setReducedMotion(media.matches);
      measure();
    };
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
    if (reducedPreference.current) {
      reducedPreference.current = false;
      setReduced(false);
      if (scene.current) scene.current.dataset.motionOverride = 'true';
      controller.current?.setReducedMotion(false);
      window.dispatchEvent(new Event('resize'));
      return;
    }
    const next = !paused;
    setPaused(next);
    controller.current?.setPaused(next);
  }
  return { scene, video, canvas, ready, paused, reduced, toggleMotion };
}
