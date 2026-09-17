import type { PlaybackClock } from './hero-playback';

export const HERO_FRAME_COUNT = 211;
export const HERO_FRAME_WIDTH = 960;
export const HERO_FRAME_HEIGHT = 540;
export const HERO_FRAMES_PER_SHEET = 8;
export const HERO_SHEET_COUNT = Math.ceil(HERO_FRAME_COUNT / HERO_FRAMES_PER_SHEET);
export const heroSheetUrl = (index: number) => `/hero-mobile-v2/${String(index).padStart(3, '0')}.webp`;
export const phoneHeroQuery = '(pointer: coarse), (max-width: 900px)';
const sheetFor = (frame: number) => Math.floor(frame / HERO_FRAMES_PER_SHEET);
const browserClock: PlaybackClock = {
  now: () => performance.now(), requestFrame: fn => requestAnimationFrame(fn),
  cancelFrame: id => cancelAnimationFrame(id), delay: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  cancelDelay: id => globalThis.clearTimeout(id),
};

/** Eight original frames per image: scrolling within a sheet needs no fetch or decode. */
export function createHeroFrames<T extends { close(): void }>(
  load: (sheet: number, signal: AbortSignal) => Promise<T>,
  callbacks: { draw(asset: T, index: number): void; onProgress(progress: number): void },
  options: { clock?: PlaybackClock; reducedMotion?: boolean } = {},
) {
  const clock = options.clock ?? browserClock;
  const assets = new Map<number, T>(), pending = new Map<number, AbortController>();
  const failures = new Map<number, number>();
  let target = 0, eased = 0, index = 0, drawn = -1, direction = 1, frame = 0;
  let paused = false, active = true, reduced = options.reducedMotion ?? false, destroyed = false;
  let lastTime = clock.now();
  const blocked = () => destroyed || paused || reduced || !active;
  function wantedSheets() {
    const current = sheetFor(index), destination = sheetFor(Math.round(target * (HERO_FRAME_COUNT - 1)));
    return [...new Set([current, destination, current + direction, current - direction, current + direction * 2])]
      .filter(key => key >= 0 && key < HERO_SHEET_COUNT).slice(0, 3);
  }
  function render() {
    if (blocked() || !assets.size) return;
    let nearest = -1, distance = Infinity, selected: T | undefined;
    for (const [sheet, asset] of assets) {
      const start = sheet * HERO_FRAMES_PER_SHEET;
      const candidate = Math.max(start, Math.min(index, start + 7, HERO_FRAME_COUNT - 1));
      if (Math.abs(candidate - index) < distance) {
        nearest = candidate; selected = asset; distance = Math.abs(candidate - index);
      }
    }
    if (selected && nearest !== drawn) { drawn = nearest; callbacks.draw(selected, nearest); callbacks.onProgress(nearest / (HERO_FRAME_COUNT - 1)); }
  }
  function trim() {
    const wanted = wantedSheets();
    const rank = (key: number) => wanted.includes(key) ? wanted.indexOf(key) : 100 + Math.abs(key - sheetFor(index));
    const ordered = [...assets.keys()].sort((a, b) => rank(a) - rank(b));
    for (const key of ordered.slice(3)) { assets.get(key)!.close(); assets.delete(key); }
  }
  function pump() {
    if (blocked()) return;
    const wanted = wantedSheets();
    // Signal obsolete work, but keep its slot until the native decode actually ends.
    for (const [key, job] of pending) if (!wanted.includes(key)) { job.abort(); }
    for (const key of wanted) {
      if (pending.size >= 2) break;
      if (assets.has(key) || pending.has(key) || (failures.get(key) ?? 0) >= 2) continue;
      const job = new AbortController(); pending.set(key, job);
      void load(key, job.signal).then(asset => {
        if (destroyed || job.signal.aborted) { asset.close(); return; }
        assets.set(key, asset); trim(); schedule();
      }).catch(() => { if (!job.signal.aborted) failures.set(key, (failures.get(key) ?? 0) + 1); }).finally(() => {
        if (pending.get(key) === job) pending.delete(key);
        pump();
      });
    }
  }
  function schedule() { if (!frame && !blocked()) frame = clock.requestFrame(tick); }
  function tick(time: number) {
    frame = 0;
    if (blocked()) return;
    const dt = Math.min(64, Math.max(1, time - lastTime)); lastTime = time;
    eased += (target - eased) * (1 - Math.exp(-dt / 55));
    if (Math.abs(target - eased) < .0005) eased = target;
    index = Math.round(eased * (HERO_FRAME_COUNT - 1));
    render(); pump();
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
    destroy() { destroyed = true; suspend(); pending.forEach(job => job.abort()); pending.clear(); assets.forEach(asset => asset.close()); assets.clear(); },
  };
}

// Compressed bytes stay small; only the three nearby sheets remain decoded.
const compressed = new Map<number, Blob>();
const downloading = new Map<number, Promise<Blob>>();
async function readSheet(index: number, signal: AbortSignal, priority: 'high' | 'low') {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const cached = compressed.get(index);
  if (cached) return cached;
  let request = downloading.get(index);
  if (!request) {
    // Shared bytes remain useful after a fast swipe. Aborting a decode must not
    // discard a download that the next scroll direction will need again.
    request = fetch(heroSheetUrl(index), { cache: 'force-cache', priority }).then(async response => {
      if (!response.ok) throw new Error('Animation image unavailable');
      const blob = new Blob([await response.blob()], { type: 'image/webp' });
      compressed.set(index, blob);
      return blob;
    }).finally(() => { downloading.delete(index); });
    downloading.set(index, request);
  }
  return new Promise<Blob>((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    request!.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export async function preloadHeroSheets(signal: AbortSignal) {
  let next = 0;
  const run = async () => {
    while (next < HERO_SHEET_COUNT && !signal.aborted) {
      const index = next++;
      try { await readSheet(index, signal, 'low'); } catch { if (signal.aborted) return; }
    }
  };
  await Promise.all([run(), run()]);
}

export async function loadHeroFrame(index: number, signal: AbortSignal) {
  const blob = await readSheet(index, signal, 'high');
  signal.throwIfAborted();
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    return { image: bitmap as CanvasImageSource, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob), image = new Image(); image.src = url;
  try { await image.decode(); } catch (error) { URL.revokeObjectURL(url); throw error; }
  return { image: image as CanvasImageSource, close: () => { image.src = ''; URL.revokeObjectURL(url); } };
}
