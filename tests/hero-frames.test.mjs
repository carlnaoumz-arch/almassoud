import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeroFrames, HERO_FRAME_COUNT, loadHeroFrame } from '../lib/hero-frames.ts';
test('hosted octet-stream frames reach the decoder with the WebP MIME type', async t => {
  let decodedType;
  t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array([82,73,70,70]), { headers: { 'content-type': 'application/octet-stream' } }));
  const previous = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async blob => { decodedType = blob.type; return { close() {} }; };
  try { const asset = await loadHeroFrame(0, new AbortController().signal); asset.close(); assert.equal(decodedType, 'image/webp'); }
  finally { if (previous) globalThis.createImageBitmap = previous; else delete globalThis.createImageBitmap; }
});
class Clock {
  time = 0; id = 0; frames = new Map();
  now = () => this.time;
  requestFrame = fn => { this.frames.set(++this.id, fn); return this.id; };
  cancelFrame = id => this.frames.delete(id);
  delay = () => 0; cancelDelay() {}
  step() { this.time += 16; const callbacks = [...this.frames.values()]; this.frames.clear(); callbacks.forEach(fn => fn(this.time)); }
}
const flush = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
function setup() {
  const clock = new Clock(), drawn = [], assets = []; let maximumLive = 0, live = 0;
  const controller = createHeroFrames(async index => {
    live++; maximumLive = Math.max(maximumLive, live);
    const asset = { index, closed: false, close() { if (!this.closed) { this.closed = true; live--; } } };
    assets.push(asset); return asset;
  }, { draw: (asset, index) => { assert.equal(asset.closed, false); drawn.push(index); }, onProgress() {} }, { clock });
  return { clock, controller, drawn, assets, maximumLive: () => maximumLive };
}
async function settle(c) { for (let i = 0; i < 70; i++) { c.clock.step(); await flush(); } }
test('phone motion reaches both ends and reverses without any video API', async () => {
  const c = setup(); await settle(c); assert.equal(c.drawn.at(-1), 0);
  c.controller.setProgress(1); await settle(c); assert.equal(c.drawn.at(-1), HERO_FRAME_COUNT - 1);
  c.controller.setProgress(.25); await settle(c); assert.equal(c.drawn.at(-1), 53);
  c.controller.destroy(); assert.ok(c.assets.every(x => x.closed));
});
test('pause and offscreen suspension preserve latest progress and bound decoded memory', async () => {
  const c = setup(); c.controller.setProgress(.3); await settle(c);
  c.controller.setPaused(true); const count = c.drawn.length;
  c.controller.setProgress(.8); await settle(c); assert.equal(c.drawn.length, count);
  c.controller.setPaused(false); await settle(c); assert.equal(c.drawn.at(-1), 168);
  c.controller.setActive(false); c.controller.setProgress(.1); await settle(c); assert.equal(c.drawn.at(-1), 168);
  c.controller.setActive(true); await settle(c); assert.equal(c.drawn.at(-1), 21);
  assert.ok(c.maximumLive() <= 11); c.controller.destroy();
});
test('late old-page downloads are closed and cannot paint a replacement page', async () => {
  const pending = [], draws = [], clock = new Clock();
  const controller = createHeroFrames((index, signal) => new Promise(resolve => pending.push({ resolve, signal })),
    { draw: () => draws.push(true), onProgress() {} }, { clock });
  assert.equal(pending.length, 3); controller.destroy();
  let closed = 0;
  pending.forEach(job => { assert.equal(job.signal.aborted, true); job.resolve({ close: () => closed++ }); });
  await flush(); assert.equal(closed, 3); assert.equal(draws.length, 0);
});
test('initial scroll while images load catches up without another gesture', async () => {
  const clock = new Clock(), pending = [], draws = [];
  const controller = createHeroFrames(index => new Promise(resolve => pending.push({ index, resolve })),
    { draw: (asset, index) => draws.push(index), onProgress() {} }, { clock });
  controller.setProgress(.9); for (let i = 0; i < 70; i++) clock.step();
  for (let i = 0; i < 10; i++) { pending.splice(0).forEach(job => job.resolve({ close() {} })); await flush(); }
  assert.equal(draws.at(-1), 189); controller.destroy();
});
test('reduced motion defaults to still; explicit play can enable scrolling', async () => {
  const clock = new Clock(), draws = [];
  const controller = createHeroFrames(async () => ({ close() {} }), { draw: (a, i) => draws.push(i), onProgress() {} }, { clock, reducedMotion: true });
  controller.setProgress(.5); for (let i = 0; i < 70; i++) clock.step(); await flush(); assert.equal(draws.length, 0);
  controller.setReducedMotion(false);
  for (let i = 0; i < 70; i++) { clock.step(); await flush(); }
  assert.equal(draws.at(-1), 105); controller.destroy();
});
test('unavailable images have bounded retries and do not loop forever', async () => {
  const attempts = new Map(), clock = new Clock();
  const controller = createHeroFrames(async i => { attempts.set(i, (attempts.get(i) ?? 0) + 1); throw new Error('network'); }, { draw() {}, onProgress() {} }, { clock });
  for (let i = 0; i < 30; i++) { clock.step(); await flush(); }
  assert.ok([...attempts.values()].every(n => n === 2)); assert.equal(clock.frames.size, 0); controller.destroy();
});
