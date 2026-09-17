import { createHeroFrames, loadHeroFrame, preloadHeroSheets, HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT } from './hero-frames';
import type { PlaybackClock } from './hero-playback';

type Command = { type: 'progress'; value: number } | { type: 'active'; value: boolean } | { type: 'resume' | 'ack' };
const port = self as unknown as { postMessage(message: unknown, transfer?: Transferable[]): void; onmessage: ((event: MessageEvent<Command>) => void) | null };
const clock: PlaybackClock = {
  now: () => performance.now(),
  requestFrame: fn => setTimeout(() => fn(performance.now()), 16) as unknown as number,
  cancelFrame: id => clearTimeout(id),
  delay: (fn, ms) => setTimeout(fn, ms) as unknown as number,
  cancelDelay: id => clearTimeout(id),
};
try {
  const surface = new OffscreenCanvas(HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT);
  const context = surface.getContext('2d', { alpha: false });
  if (!context || typeof createImageBitmap !== 'function') throw new Error('Worker canvas unavailable');
  let awaitingPaint = false;
  let pending: { bitmap: ImageBitmap; index: number } | undefined;
  const send = (frame: { bitmap: ImageBitmap; index: number }) => {
    awaitingPaint = true;
    port.postMessage({ type: 'frame', ...frame }, [frame.bitmap]);
  };
  const playback = createHeroFrames(loadHeroFrame, {
    onProgress() {},
    draw(asset, index) {
      const cell = index % 8;
      context.drawImage(asset.image, (cell % 2) * HERO_FRAME_WIDTH, Math.floor(cell / 2) * HERO_FRAME_HEIGHT,
        HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT, 0, 0, HERO_FRAME_WIDTH, HERO_FRAME_HEIGHT);
      const frame = { bitmap: surface.transferToImageBitmap(), index };
      if (awaitingPaint) { pending?.bitmap.close(); pending = frame; }
      else send(frame);
    },
  }, { clock });
  // Fetch compressed images immediately; decode only the nearby sheets.
  void preloadHeroSheets(new AbortController().signal);
  port.onmessage = ({ data }) => {
    if (data.type === 'progress') playback.setProgress(data.value);
    else if (data.type === 'active') {
      playback.setActive(data.value);
      if (!data.value) { pending?.bitmap.close(); pending = undefined; }
    } else if (data.type === 'resume') playback.resumeLoading();
    else if (data.type === 'ack') {
      awaitingPaint = false;
      if (pending) { const frame = pending; pending = undefined; send(frame); }
    }
  };
} catch (error) {
  port.postMessage({ type: 'unsupported', reason: error instanceof Error ? error.message : 'Unsupported worker canvas' });
}
