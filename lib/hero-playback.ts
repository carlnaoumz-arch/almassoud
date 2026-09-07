/** One owner for video readiness, the short intro, and scroll-driven seeking. */
export interface PlaybackClock {
  now(): number;
  requestFrame(callback: (time: number) => void): number;
  cancelFrame(id: number): void;
  delay(callback: () => void, milliseconds: number): number;
  cancelDelay(id: number): void;
}

type Video = Pick<HTMLVideoElement,
  'readyState' | 'duration' | 'currentTime' | 'seeking' | 'muted' | 'defaultMuted' |
  'playsInline' | 'play' | 'pause' | 'load' | 'error' | 'addEventListener' | 'removeEventListener'>;

const browserClock: PlaybackClock = {
  now: () => performance.now(),
  requestFrame: callback => requestAnimationFrame(callback),
  cancelFrame: id => cancelAnimationFrame(id),
  delay: (callback, ms) => window.setTimeout(callback, ms),
  cancelDelay: id => window.clearTimeout(id),
};

export function createHeroPlayback(
  video: Video,
  callbacks: { onReady(ready: boolean): void; onProgress(progress: number): void },
  options: { reducedMotion?: boolean; clock?: PlaybackClock } = {},
) {
  const clock = options.clock ?? browserClock;
  let destroyed = false, paused = false, active = true;
  let reduced = options.reducedMotion ?? false;
  let ready = false, intro = true, playPending = false, introPlaying = false;
  let target = 0, eased = 0, frame = 0, retry = 0, retryCount = 0, wake = 0;
  let lastTime = clock.now(), playVersion = 0;
  const listeners: Array<[string, EventListener]> = [];
  const blocked = () => destroyed || paused || reduced || !active;
  const validDuration = () => Number.isFinite(video.duration) && video.duration > 0;
  const introEnd = () => Math.min(1.2, Math.max(0, video.duration - .06));
  const timeAt = (p: number) => introEnd() + Math.max(0, video.duration - .06 - introEnd()) * p;

  function schedule() {
    if (!frame && !blocked()) frame = clock.requestFrame(tick);
  }
  function stopPlayback() {
    playVersion++;
    playPending = false;
    introPlaying = false;
    video.pause();
  }
  function waitForDecoder() {
    if (!wake && !blocked()) wake = clock.delay(() => {
      wake = 0;
      refresh();
      schedule();
    }, 100);
  }
  function tick(time: number) {
    frame = 0;
    if (blocked()) return;
    const dt = Math.min(64, Math.max(1, time - lastTime));
    lastTime = time;
    // Follow scroll with a short time-based ease, independent of display refresh rate.
    eased += (target - eased) * (1 - Math.exp(-dt / 85));
    if (Math.abs(target - eased) < .0005) eased = target;
    callbacks.onProgress(eased);
    // A paused video can drop to HAVE_METADATA during a seek and omit canplay.
    // Keep the latest target alive instead of waiting for another user scroll.
    if (!ready || video.readyState < 2 || !validDuration()) {
      if (Math.abs(target - eased) >= .0005) schedule();
      waitForDecoder();
      return;
    }
    if (intro) {
      if (video.currentTime < introEnd()) { schedule(); return; }
      intro = false;
      stopPlayback();
    }
    // Never interrupt an in-flight decoder seek. seeked always picks up the latest target.
    if (!video.seeking && Math.abs(video.currentTime - timeAt(eased)) > 1 / 48) {
      try { video.currentTime = timeAt(eased); } catch { /* Retry after the next media-ready event. */ }
    }
    if (Math.abs(target - eased) >= .0005) schedule();
    if (video.seeking) waitForDecoder();
  }
  function playIntro() {
    if (!intro || blocked() || !ready || playPending || introPlaying) return;
    playPending = true;
    const version = ++playVersion;
    video.play().then(() => {
      if (destroyed || version !== playVersion || blocked() || !intro) { video.pause(); return; }
      playPending = false;
      introPlaying = true;
      lastTime = clock.now();
      schedule();
    }).catch(() => {
      if (destroyed || version !== playVersion) return;
      // Autoplay rejection must not prevent a poster-to-video reveal or scroll playback.
      playPending = false;
      intro = false;
      schedule();
    });
  }
  function refresh() {
    if (destroyed) return;
    // Events may fire before React hydrates, especially with a warm browser cache.
    if (video.readyState >= 2) {
      if (!ready) { ready = true; callbacks.onReady(true); }
      if (retry) { clock.cancelDelay(retry); retry = 0; }
      if (intro && target === 0) playIntro(); else schedule();
    }
  }
  function recover() {
    if (destroyed || retry || retryCount >= 2 || video.error?.code === 4) return;
    retry = clock.delay(() => {
      retry = 0;
      if (destroyed) return;
      retryCount++;
      stopPlayback();
      ready = false;
      callbacks.onReady(false);
      video.load();
      refresh();
    }, 750 * (retryCount + 1));
  }
  function on(name: string, callback: () => void) {
    const listener: EventListener = callback;
    video.addEventListener(name, listener);
    listeners.push([name, listener]);
  }
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'progress'].forEach(name => on(name, refresh));
  on('seeked', () => { refresh(); schedule(); });
  on('timeupdate', () => { if (intro && validDuration() && video.currentTime >= introEnd()) schedule(); });
  on('error', recover);
  on('ended', () => { intro = false; stopPlayback(); });
  if (reduced) video.pause();
  refresh();

  return {
    setProgress(value: number) {
      const next = Math.min(1, Math.max(0, value));
      if (next > .0005 || target > .0005) { intro = false; stopPlayback(); }
      target = next;
      refresh();
      schedule();
    },
    setPaused(value: boolean) {
      paused = value;
      if (value) stopPlayback(); else { lastTime = clock.now(); refresh(); schedule(); }
    },
    setReducedMotion(value: boolean) {
      reduced = value;
      if (value) { stopPlayback(); callbacks.onProgress(0); }
      else { lastTime = clock.now(); refresh(); schedule(); }
    },
    setActive(value: boolean) {
      active = value;
      if (!value) stopPlayback(); else { lastTime = clock.now(); refresh(); schedule(); }
    },
    refresh,
    resumeLoading() {
      if (video.error) { retryCount = 0; recover(); } else refresh();
    },
    destroy() {
      destroyed = true;
      stopPlayback();
      if (frame) clock.cancelFrame(frame);
      if (wake) clock.cancelDelay(wake);
      if (retry) clock.cancelDelay(retry);
      listeners.forEach(([name, listener]) => video.removeEventListener(name, listener));
    },
  };
}
