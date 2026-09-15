import type { PlaybackClock } from './hero-playback';

export const HERO_FRAME_COUNT = 211;
export const heroFrameUrl = (index: number) => `/hero-frames-v1/${String(index).padStart(3, '0')}.webp`;
export const phoneHeroQuery = '(pointer: coarse), (max-width: 900px)';

const browserClock: PlaybackClock = {
  now: () => performance.now(), requestFrame: fn => requestAnimationFrame(fn),
  cancelFrame: id => cancelAnimationFrame(id), delay: (fn, ms) => window.setTimeout(fn, ms),
  cancelDelay: id => window.clearTimeout(id),
};

/** Scroll frames do not depend on a phone permitting video loading or autoplay. */
export function createHeroFrames<T extends { close(): void }>(
  load: (index: number, signal: AbortSignal) => Promise<T>,
  callbacks: { draw(asset: T, index: number): void; onProgress(progress: number): void },
  options: { clock?: PlaybackClock; reducedMotion?: boolean } = {},
) {
  const clock = options.clock ?? browserClock;
  const assets = new Map<number, T>(), pending = new Set<number>(), failures = new Map<number, number>();
  const abort = new AbortController();
  let target = 0, eased = 0, index = 0, drawn = -1, direction = 1, frame = 0;
  let paused = false, active = true, reduced = options.reducedMotion ?? false, destroyed = false;
  let lastTime = clock.now();
  const blocked = () => destroyed || paused || reduced || !active;
  function render() {
    if (blocked() || !assets.size) return;
    const nearest = [...assets.keys()].sort((a, b) => Math.abs(a - index) - Math.abs(b - index))[0];
    if (nearest !== drawn) { drawn = nearest; callbacks.draw(assets.get(nearest)!, nearest); }
  }
  function trim() {
    const ordered = [...assets.keys()].sort((a, b) => Math.abs(a - index) - Math.abs(b - index));
    for (const key of ordered.slice(8)) { assets.get(key)!.close(); assets.delete(key); }
  }
  function pump() {
    if (blocked()) return;
    // The latest requested frame always comes before speculative neighbours.
    const wanted = [index, ...Array.from({ length: 6 }, (_, n) => index + direction * (n + 1)), index - direction];
    for (const key of wanted) {
      if (pending.size >= 3) break;
      if (key < 0 || key >= HERO_FRAME_COUNT || assets.has(key) || pending.has(key) || (failures.get(key) ?? 0) >= 2) continue;
      pending.add(key);
      void load(key, abort.signal).then(asset => {
        if (destroyed) { asset.close(); return; }
        assets.set(key, asset); trim(); render();
      }).catch(() => { failures.set(key, (failures.get(key) ?? 0) + 1); }).finally(() => {
        pending.delete(key); pump();
      });
    }
  }
  function schedule() { if (!frame && !blocked()) frame = clock.requestFrame(tick); }
  function tick(time: number) {
    frame = 0;
    if (blocked()) return;
    const dt = Math.min(64, Math.max(1, time - lastTime)); lastTime = time;
    eased += (target - eased) * (1 - Math.exp(-dt / 85));
    if (Math.abs(target - eased) < .0005) eased = target;
    index = Math.round(eased * (HERO_FRAME_COUNT - 1));
    callbacks.onProgress(eased); render(); pump();
    if (eased !== target) schedule();
  }
  function suspend() { if (frame) clock.cancelFrame(frame); frame = 0; }
  function resume() { lastTime = clock.now(); failures.clear(); schedule(); pump(); }
  schedule(); pump();
  return {
    setProgress(value: number) {
      const next = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
      if (next !== target) direction = next > target ? 1 : -1;
      target = next; schedule();
    },
    setPaused(value: boolean) { paused = value; if (value) suspend(); else resume(); },
    setActive(value: boolean) { active = value; if (!value) suspend(); else resume(); },
    setReducedMotion(value: boolean) { reduced = value; if (value) suspend(); else resume(); },
    resumeLoading: resume,
    destroy() { destroyed = true; suspend(); abort.abort(); assets.forEach(asset => asset.close()); assets.clear(); },
  };
}

export async function loadHeroFrame(index: number, signal: AbortSignal) {
  const response = await fetch(heroFrameUrl(index), { signal, cache: 'force-cache', priority: 'high' });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Frame unavailable');
  const blob = await response.blob();
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return { image: bitmap as CanvasImageSource, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob), image = new Image();
  image.src = url;
  try { await image.decode(); } catch (error) { URL.revokeObjectURL(url); throw error; }
  return { image: image as CanvasImageSource, close: () => { image.src = ''; URL.revokeObjectURL(url); } };
}
