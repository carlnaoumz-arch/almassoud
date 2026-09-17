import HeroWorker from './hero-worker?worker';
import { createHeroFrames, loadHeroFrame, preloadHeroSheets, HERO_FRAME_COUNT, HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT } from './hero-frames';

/** Decode and crop large sheets off-thread; the UI paints one small finished frame. */
export function createPhoneHero(context: CanvasRenderingContext2D, callbacks: {
  onReady(): void; onProgress(progress: number): void; onFrame(index: number): void;
  onRenderer(mode: 'worker' | 'main', reason?: string): void;
}) {
  let worker: Worker | undefined, fallback: ReturnType<typeof createHeroFrames> | undefined;
  let destroyed = false, active = true, ready = false, progress = 0, raf = 0, startup = 0;
  let queued: { bitmap: ImageBitmap; index: number } | undefined;
  const abort = new AbortController();
  const painted = (index: number) => {
    callbacks.onFrame(index); callbacks.onProgress(index / (HERO_FRAME_COUNT - 1));
    if (!ready) { ready = true; clearTimeout(startup); callbacks.onReady(); }
  };
  const discard = () => { cancelAnimationFrame(raf); raf = 0; queued?.bitmap.close(); queued = undefined; };
  const useFallback = (reason = 'unsupported') => {
    if (destroyed || fallback) return;
    clearTimeout(startup); worker?.terminate(); worker = undefined; discard();
    callbacks.onRenderer('main', reason);
    fallback = createHeroFrames(loadHeroFrame, {
      onProgress() {},
      draw(asset, index) {
        const cell = index % 8;
        context.drawImage(asset.image, (cell % 2) * HERO_FRAME_WIDTH, Math.floor(cell / 2) * HERO_FRAME_HEIGHT,
          HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT, 0, 0, HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT);
        painted(index);
      },
    });
    fallback.setActive(active); fallback.setProgress(progress);
    void preloadHeroSheets(abort.signal);
  };
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') throw new Error('Worker unavailable');
    worker = new HeroWorker();
    callbacks.onRenderer('worker');
    worker.onerror = event => useFallback(event.message || 'Worker failed');
    worker.onmessage = ({ data }: MessageEvent<{ type: string; bitmap?: ImageBitmap; index: number; reason?: string }>) => {
      if (data.type === 'unsupported') { useFallback(data.reason); return; }
      if (!data.bitmap) return;
      if (destroyed || !active) { data.bitmap.close(); worker?.postMessage({ type: 'ack' }); return; }
      queued?.bitmap.close(); queued = { bitmap: data.bitmap, index: data.index };
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        const frame = queued; queued = undefined;
        if (frame) {
          context.drawImage(frame.bitmap, 0, 0); frame.bitmap.close(); painted(frame.index);
        }
        worker?.postMessage({ type: 'ack' });
      });
    };
    // Recover if a browser accepts workers but cannot execute the canvas code.
    startup = window.setTimeout(() => { if (!ready) useFallback('Startup timeout'); }, 8000);
  } catch (error) { useFallback(error instanceof Error ? error.message : 'Worker unavailable'); }
  return {
    setProgress(value: number) { progress = value; if (fallback) fallback.setProgress(value); else worker?.postMessage({ type: 'progress', value }); },
    setActive(value: boolean) {
      active = value;
      if (fallback) fallback.setActive(value); else worker?.postMessage({ type: 'active', value });
      if (!value) { discard(); worker?.postMessage({ type: 'ack' }); }
    },
    resumeLoading() { if (fallback) fallback.resumeLoading(); else worker?.postMessage({ type: 'resume' }); },
    destroy() { destroyed = true; clearTimeout(startup); discard(); abort.abort(); worker?.terminate(); fallback?.destroy(); },
  };
}
