import type { PlaybackClock } from './hero-playback';

const browserClock: PlaybackClock = {
  now: () => performance.now(), requestFrame: fn => requestAnimationFrame(fn),
  cancelFrame: id => cancelAnimationFrame(id), delay: (fn, ms) => window.setTimeout(fn, ms),
  cancelDelay: id => window.clearTimeout(id),
};

/** Replay the original sequence forward and back at the top; scrolling takes over. */
export function createHeroAutoplay(setProgress: (progress: number) => void, clock = browserClock) {
  let ready = false, active = true, destroyed = false, scroll = 0, frame = 0;
  let elapsed = 0, lastTime = clock.now();
  const enabled = () => ready && active && !destroyed && scroll === 0;
  const stop = () => { if (frame) clock.cancelFrame(frame); frame = 0; };
  function start() { if (enabled() && !frame) { lastTime = clock.now(); frame = clock.requestFrame(tick); } }
  function tick(time: number) {
    frame = 0;
    if (!enabled()) return;
    elapsed = (elapsed + Math.min(64, Math.max(0, time - lastTime))) % 17500;
    lastTime = time;
    const phase = elapsed / 8750;
    setProgress(phase <= 1 ? phase : 2 - phase);
    frame = clock.requestFrame(tick);
  }
  return {
    setReady(value: boolean) { ready = value; if (value) start(); else stop(); },
    setActive(value: boolean) { active = value; if (value) start(); else stop(); },
    setScrollProgress(value: number) {
      const next = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
      if (next > 0) { scroll = next; elapsed = next * 8750; stop(); setProgress(next); }
      else { if (scroll > 0) { elapsed = 0; setProgress(0); } scroll = 0; start(); }
    },
    destroy() { destroyed = true; stop(); },
  };
}
