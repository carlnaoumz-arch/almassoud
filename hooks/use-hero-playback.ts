'use client';
import { useEffect, useRef, useState } from 'react';
import { createHeroPlayback } from '../lib/hero-playback';
import { createHeroAutoplay } from '../lib/hero-autoplay';
import { peekHeroSource, pendingHeroSource, prepareHeroSource, restoreHeroSource } from '../lib/hero-source';
import { createHeroFrames, loadHeroFrame, phoneHeroQuery, preloadHeroSheets, HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT } from '../lib/hero-frames';

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
    let painted = false, warmup = 0, geometryDirty = true, sceneTop = 0, sceneHeight = 0, scrollDistance = 1;
    const warmupAbort = new AbortController();
    const cached = frames ? undefined : peekHeroSource();
    if (cached && film.src !== cached) { film.src = cached; film.load(); }
    const useCompleteSource = (source: Promise<string | undefined>) => {
      void source.then(url => {
        if (disposed || !url || film.src === url) return;
        film.src = url;
        if ('sourceChanged' in playback && typeof playback.sourceChanged === 'function') playback.sourceChanged();
      }).catch(() => { /* Keep streaming and allow the controller to recover. */ });
    };
    let scrollProgress = 0, mediaReady = false;
    let autoplay: ReturnType<typeof createHeroAutoplay> | undefined;
    const onReady = (value: boolean) => { mediaReady = value; setReady(value); autoplay?.setReady(value); };
    const onProgress = (motionProgress: number) => {
        // Keep the opening headline and order links visible during automatic playback.
        const progress = scrollProgress === 0 ? 0 : motionProgress;
        element.style.setProperty('--progress', String(progress));
        element.dataset.phase = progress < .25 ? 'grill' : progress < .68 ? 'ingredients' : 'platter';
    };
    const playback = frames ? createHeroFrames(loadHeroFrame, {
      onProgress,
      draw: (asset, index) => {
        const cell = index % 8;
        context!.drawImage(asset.image, (cell % 2) * HERO_FRAME_WIDTH, Math.floor(cell / 2) * HERO_FRAME_HEIGHT,
          HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT, 0, 0, HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT);
        element.dataset.frameTime = ((29 + index) / 24).toFixed(3);
        if (!painted) {
          painted = true; onReady(true);
          warmup = window.setTimeout(() => { void preloadHeroSheets(warmupAbort.signal); }, 400);
        }
      },
    }) : createHeroPlayback(film, {
      onReady,
      onProgress,
      onStall: () => useCompleteSource(prepareHeroSource()),
      onFrame: time => { element.dataset.frameTime = time.toFixed(3); },
    });
    autoplay = createHeroAutoplay(progress => playback.setProgress(progress));
    autoplay.setReady(mediaReady);
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
      if (next !== active) { active = next; playback.setActive(next); autoplay?.setActive(next); }
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
      if (frames) { scrollProgress = Math.max(0, (window.scrollY - sceneTop) / scrollDistance); autoplay!.setScrollProgress(scrollProgress); return; }
      const stickyHeight = element.firstElementChild?.getBoundingClientRect().height ?? window.innerHeight;
      const distance = Math.max(1, element.offsetHeight - stickyHeight);
      scrollProgress = Math.max(0, -element.getBoundingClientRect().top / distance);
      autoplay!.setScrollProgress(scrollProgress);
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
    const suspend = () => { active = false; autoplay?.setActive(false); playback.setActive(false); };
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
      autoplay?.destroy();
      playback.destroy();
      clearTimeout(warmup); warmupAbort.abort();
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
