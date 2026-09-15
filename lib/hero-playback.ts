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
  'playsInline' | 'paused' | 'play' | 'pause' | 'load' | 'error' | 'addEventListener' | 'removeEventListener'>;

const browserClock: PlaybackClock = {
  now: () => performance.now(),
  requestFrame: callback => requestAnimationFrame(callback),
  cancelFrame: id => cancelAnimationFrame(id),
  delay: (callback, ms) => window.setTimeout(callback, ms),
  cancelDelay: id => window.clearTimeout(id),
};

export function createHeroPlayback(
  video: Video,
  callbacks: { onReady(ready: boolean): void; onProgress(progress: number): void; onStall?(): void },
  options: { reducedMotion?: boolean; clock?: PlaybackClock } = {},
) {
  const clock = options.clock ?? browserClock;
  let destroyed = false, paused = false, active = true, failed = false;
  let reduced = options.reducedMotion ?? false;
  let ready = false, intro = true, playPending = false;
  let target = 0, eased = 0, frame = 0, retry = 0, retryCount = 0, wake = 0;
  let lastTime = clock.now(), playVersion = 0;
  let lastAdvance = clock.now(), lastMediaTime = video.currentTime, stalled = false;
  const listeners: Array<[string, EventListener]> = [];
  const blocked = () => destroyed || paused || reduced || !active || failed;
  const validDuration = () => Number.isFinite(video.duration) && video.duration > 0;
  const introEnd = () => Math.min(1.2, Math.max(0, video.duration - .06));
  const timeAt = (p: number) => introEnd() + Math.max(0, video.duration - .06 - introEnd()) * p;

  function schedule() {
    if (!frame && !blocked()) frame = clock.requestFrame(tick);
  }
  function stopPlayback() {
    playVersion++;
    playPending = false;
    if (!video.paused) video.pause();
  }
  function stopWork() {
    if (frame) clock.cancelFrame(frame);
    if (wake) clock.cancelDelay(wake);
    if (retry) clock.cancelDelay(retry);
    frame = wake = retry = 0;
  }
  function resetWatchdog() {
    lastTime = lastAdvance = clock.now();
    lastMediaTime = video.currentTime;
    stalled = false;
  }
  function checkStall() {
    const time = clock.now();
    if (!video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - lastMediaTime) > .01) {
      lastMediaTime = video.currentTime;
      lastAdvance = time;
    }
    if (time - lastAdvance > 3000 && !stalled) {
      stalled = true;
      callbacks.onStall?.();
    }
    // Some WebKit decoder stalls produce neither error nor seeked.
    if (time - lastAdvance > 6000) recover();
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
      checkStall();
      if (Math.abs(target - eased) >= .0005) schedule();
      waitForDecoder();
      return;
    }
    if (intro) {
      if (video.currentTime < introEnd()) { playIntro(); checkStall(); schedule(); return; }
      intro = false;
      stopPlayback();
    }
    // Never interrupt an in-flight decoder seek. seeked always picks up the latest target.
    if (!video.seeking && Math.abs(video.currentTime - timeAt(eased)) > 1 / 48) {
      try { video.currentTime = timeAt(eased); } catch { waitForDecoder(); }
    }
    if (Math.abs(target - eased) >= .0005) schedule();
    if (video.seeking || Math.abs(video.currentTime - timeAt(eased)) > 1 / 48) {
      checkStall();
      waitForDecoder();
    } else resetWatchdog();
  }
  function playIntro() {
    if (!intro || blocked() || !ready || playPending || !video.paused) return;
    playPending = true;
    const version = ++playVersion;
    video.play().then(() => {
      // An old controller must never pause the new owner of this same element.
      if (destroyed || version !== playVersion) return;
      playPending = false;
      if (blocked() || !intro) return;
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
      if (retry && !stalled && !video.error) { clock.cancelDelay(retry); retry = 0; }
      if (intro) playIntro();
      schedule();
    }
  }
  function recover() {
    if (blocked() || retry) return;
    if (retryCount >= 2 || video.error?.code === 4) {
      failed = true;
      stopPlayback();
      stopWork();
      callbacks.onReady(false);
      return;
    }
    retry = clock.delay(() => {
      retry = 0;
      if (destroyed) return;
      retryCount++;
      stopPlayback();
      ready = false;
      callbacks.onReady(false);
      resetWatchdog();
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
  ['waiting', 'stalled', 'pause'].forEach(name => on(name, () => { schedule(); waitForDecoder(); }));
  on('seeked', () => { refresh(); schedule(); });
  on('timeupdate', () => { if (intro && validDuration() && video.currentTime >= introEnd()) schedule(); });
  on('error', recover);
  on('ended', () => { intro = false; stopPlayback(); });
  if (reduced) video.pause();
  refresh();

  return {
    setProgress(value: number) {
      const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
      const next = clamped < .0005 ? 0 : clamped;
      if (intro && next > 0) { intro = false; stopPlayback(); }
      if (Math.abs(next - target) > .001) resetWatchdog();
      target = next;
      refresh();
      schedule();
    },
    setPaused(value: boolean) {
      paused = value;
      if (value) { stopPlayback(); stopWork(); } else { resetWatchdog(); refresh(); schedule(); }
    },
    setReducedMotion(value: boolean) {
      reduced = value;
      if (value) { stopPlayback(); stopWork(); callbacks.onProgress(0); }
      else { resetWatchdog(); refresh(); schedule(); }
    },
    setActive(value: boolean) {
      active = value;
      if (!value) { stopPlayback(); stopWork(); } else { resetWatchdog(); refresh(); schedule(); }
    },
    refresh,
    resumeLoading() {
      failed = false;
      retryCount = 0;
      resetWatchdog();
      if (video.error) { retryCount = 0; recover(); } else refresh();
    },
    sourceChanged() {
      stopPlayback();
      stopWork();
      failed = false;
      retryCount = 0;
      ready = false;
      resetWatchdog();
      video.load();
      refresh();
      schedule();
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
