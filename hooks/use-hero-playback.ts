'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';
import { createPhoneHero } from '../lib/hero-worker-client';
import { peekHeroSource, pendingHeroSource, prepareHeroSource, restoreHeroSource } from '../lib/hero-source';
import { phoneHeroQuery, HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT } from '../lib/hero-frames';

export function useHeroPlayback() {
  const scene = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = scene.current, film = video.current;
    if (!element || !film) return;
    const phone = window.matchMedia(phoneHeroQuery).matches;
    const surface = canvas.current;
    const context = phone ? surface?.getContext('2d', { alpha: false }) : null;
    const frames = Boolean(phone && surface && context);
    if (frames) { surface!.width = HERO_FRAME_WIDTH; surface!.height = HERO_FRAME_HEIGHT; }
    element.dataset.renderer = frames ? 'frames' : 'video';
    let disposed = false, frame = 0, active: boolean | undefined;
    let geometryDirty = true, sceneTop = 0, sceneHeight = 0, scrollDistance = 1;
    const cached = frames ? undefined : peekHeroSource();
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
    const playback = frames ? createPhoneHero(context!, {
      onReady: () => setReady(true),
      onProgress,
      onFrame: index => { element.dataset.frameTime = ((29 + index) / 24).toFixed(3); },
      onRenderer: (mode, reason) => { element.dataset.engine = mode; if (reason) element.dataset.engineFallback = reason; },
    }) : createHeroPlayback(film, {
      onReady: setReady,
      onProgress,
      onStall: () => useCompleteSource(prepareHeroSource()),
      onFrame: time => { element.dataset.frameTime = time.toFixed(3); },
    }, { intro: false });
    if (frames) { film.pause(); }
    else {
      // If a desktop window selected no initial source, start its normal video now.
      if (film.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) film.load();
      const pending = pendingHeroSource();
      if (!cached) useCompleteSource(pending ?? restoreHeroSource());
    }
    const updateActivity = () => {
      const bounds = frames
        ? { top: sceneTop - window.scrollY, bottom: sceneTop + sceneHeight - window.scrollY }
        : film.getBoundingClientRect();
      const next = !document.hidden && bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (next !== active) { active = next; playback.setActive(next); }
    };
    const measure = () => {
      frame = 0;
      if (frames && geometryDirty) {
        sceneTop = element.getBoundingClientRect().top + window.scrollY;
        sceneHeight = element.offsetHeight;
        scrollDistance = Math.max(1, sceneHeight - (element.firstElementChild?.getBoundingClientRect().height ?? window.innerHeight));
        geometryDirty = false;
      }
      updateActivity();
      if (frames) { playback.setProgress((window.scrollY - sceneTop) / scrollDistance); return; }
      const stickyHeight = element.firstElementChild?.getBoundingClientRect().height ?? window.innerHeight;
      const distance = Math.max(1, element.offsetHeight - stickyHeight);
      playback.setProgress(-element.getBoundingClientRect().top / distance);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const resize = () => { geometryDirty = true; scroll(); };
    const visibility = () => { updateActivity(); if (!document.hidden) measure(); };
    const restore = () => {
      active = undefined;
      geometryDirty = true;
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

  return { scene, video, canvas, ready };
}
