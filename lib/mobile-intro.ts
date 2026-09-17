/** A short native video, played once. No scroll seeks, image sheets or animation loop. */
type Media = Pick<HTMLVideoElement, 'muted' | 'defaultMuted' | 'playsInline' | 'autoplay' | 'loop' | 'paused' | 'ended' | 'readyState' | 'currentTime' | 'play' | 'pause' | 'addEventListener' | 'removeEventListener'>;
export function createMobileIntro(video: Media, callbacks: {
  onReady(): void; onFallback(): void; onState(state: 'playing' | 'complete' | 'fallback'): void;
}, timers = { set: (fn: () => void, ms: number) => setTimeout(fn, ms), clear: (id: ReturnType<typeof setTimeout>) => clearTimeout(id) }) {
  let disposed = false, active = true, finished = video.ended, fallback = false, pending = false;
  let version = 0, watchdog: ReturnType<typeof setTimeout> | undefined;
  const listeners: Array<[string, EventListener]> = [];
  const clear = () => { if (watchdog !== undefined) timers.clear(watchdog); watchdog = undefined; };
  const useFallback = () => {
    if (disposed || fallback || !active) return;
    fallback = true; version++; pending = false; clear(); video.pause();
    callbacks.onState('fallback'); callbacks.onFallback();
  };
  const watch = () => {
    clear();
    if (active && !finished && !fallback) watchdog = timers.set(() => {
      // Network buffering is not a broken decoder: do not start another download.
      if (video.readyState >= 3 && !video.paused) useFallback();
    }, 3000);
  };
  const playing = () => {
    if (disposed || !active || fallback) return;
    callbacks.onReady(); callbacks.onState('playing'); watch();
  };
  const ended = () => {
    if (disposed) return;
    finished = true; clear(); callbacks.onReady(); callbacks.onState('complete');
  };
  const attempt = () => {
    if (disposed || !active || fallback || finished || pending) return;
    if (!video.paused && video.readyState >= 2) { playing(); return; }
    pending = true; const request = ++version;
    void video.play().then(() => {
      if (disposed || request !== version) return;
      pending = false;
      if (active) playing();
    }).catch(error => {
      if (disposed || request !== version) return;
      pending = false;
      if (error?.name !== 'AbortError') useFallback();
    });
  };
  const on = (name: string, fn: () => void) => { const listener: EventListener = fn; video.addEventListener(name, listener); listeners.push([name, listener]); };
  video.muted = video.defaultMuted = video.playsInline = video.autoplay = true;
  video.loop = false;
  on('playing', playing); on('ended', ended); on('error', useFallback);
  on('waiting', clear); on('stalled', clear);
  on('pause', () => { if (!video.ended) attempt(); });
  on('canplay', attempt); on('loadeddata', attempt); on('timeupdate', () => { if (video.ended) ended(); else if (!video.paused) watch(); });
  if (finished) ended(); else attempt();
  return {
    setActive(value: boolean) {
      active = value;
      if (!value) { version++; pending = false; clear(); video.pause(); }
      else attempt();
    },
    restart() {
      finished = false; fallback = false; pending = false; version++; clear();
      try { video.currentTime = 0; } catch { /* Metadata may still be loading. */ }
      attempt();
    },
    destroy() { disposed = true; version++; clear(); listeners.forEach(([name, listener]) => video.removeEventListener(name, listener)); video.pause(); },
  };
}
