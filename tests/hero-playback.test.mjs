import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeroPlayback } from '../lib/hero-playback.ts';

class FakeClock {
  time = 0; id = 0; frames = new Map(); timers = new Map();
  now = () => this.time;
  requestFrame = callback => { const id = ++this.id; this.frames.set(id, callback); return id; };
  cancelFrame = id => this.frames.delete(id);
  delay = (callback, ms) => { const id = ++this.id; this.timers.set(id, { callback, at: this.time + ms }); return id; };
  cancelDelay = id => this.timers.delete(id);
  step(ms = 16) {
    this.time += ms;
    const frames = [...this.frames.values()]; this.frames.clear();
    frames.forEach(callback => callback(this.time));
    for (const [id, timer] of this.timers) if (timer.at <= this.time) { this.timers.delete(id); timer.callback(); }
  }
}
class FakeVideo extends EventTarget {
  readyState = 0; duration = NaN; seeking = false; time = 0; paused = true;
  muted = false; defaultMuted = false; playsInline = false; error = null;
  playCalls = 0; pauseCalls = 0; loadCalls = 0; seeks = []; rejectPlay = false;
  get currentTime() { return this.time; }
  set currentTime(value) { this.seeks.push(value); this.time = value; this.seeking = true; }
  play() { this.playCalls++; if (!this.rejectPlay) this.paused = false; return this.rejectPlay ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); }
  pause() { this.pauseCalls++; this.paused = true; }
  load() { this.loadCalls++; this.paused = true; this.seeking = false; this.time = 0; this.readyState = 0; this.duration = NaN; this.error = null; }
  completeSeek() { this.seeking = false; this.dispatchEvent(new Event('seeked')); }
  becomeReady() { this.duration = 10.042; this.readyState = 3; this.dispatchEvent(new Event('canplay')); }
}
class FramedVideo extends FakeVideo {
  frameCallbacks = new Map(); frameId = 0;
  requestVideoFrameCallback = callback => { const id = ++this.frameId; this.frameCallbacks.set(id, callback); return id; };
  cancelVideoFrameCallback = id => this.frameCallbacks.delete(id);
  present(time = this.currentTime) {
    const callbacks = [...this.frameCallbacks.values()]; this.frameCallbacks.clear();
    callbacks.forEach(fn => fn(0, { mediaTime: time }));
  }
}
function setup({ cached = false, reject = false, reduced = false, intro = true } = {}) {
  const video = new FakeVideo(), clock = new FakeClock(), readiness = [], positions = [];
  if (cached) { video.readyState = 4; video.duration = 10.042; }
  video.rejectPlay = reject;
  const playback = createHeroPlayback(video, { onReady: value => readiness.push(value), onProgress: p => positions.push(p) }, { clock, reducedMotion: reduced, intro });
  return { video, clock, readiness, positions, playback };
}
function settle(ctx, count = 100) {
  for (let i = 0; i < count; i++) { ctx.clock.step(); if (ctx.video.seeking) ctx.video.completeSeek(); }
}

test('cached video is revealed without waiting for a missed loadeddata event', async () => {
  const c = setup({ cached: true });
  assert.deepEqual(c.readiness, [true]);
  await Promise.resolve();
  c.video.dispatchEvent(new Event('canplay'));
  assert.equal(c.video.playCalls, 1, 'readiness events must not start competing play requests');
  c.playback.destroy();
});
test('scroll before metadata/data arrives resumes at the latest position on canplay', () => {
  const c = setup();
  c.playback.setProgress(.7); c.clock.step();
  assert.equal(c.video.seeks.length, 0);
  c.video.becomeReady(); settle(c);
  assert.deepEqual(c.readiness, [true]);
  assert.ok(Math.abs(c.video.currentTime - (1.2 + (10.042 - .06 - 1.2) * .7)) < .025);
  assert.equal(c.video.playCalls, 0);
  c.playback.destroy();
});
test('rapid scroll coalesces pending seeks and settles to newest target', () => {
  const c = setup({ cached: true });
  c.playback.setProgress(.8); c.clock.step();
  assert.equal(c.video.seeks.length, 1);
  c.playback.setProgress(.2);
  for (let i = 0; i < 10; i++) c.clock.step();
  assert.equal(c.video.seeks.length, 1, 'must not abort an in-flight seek');
  c.video.completeSeek(); settle(c);
  assert.ok(Math.abs(c.positions.at(-1) - .2) < .001);
  assert.ok(Math.abs(c.video.currentTime - (1.2 + (10.042 - .06 - 1.2) * .2)) < .025);
  c.playback.destroy();
});
test('autoplay rejection does not hide video or disable scroll playback', async () => {
  const c = setup({ cached: true, reject: true });
  await Promise.resolve(); await Promise.resolve();
  c.playback.setProgress(.5); settle(c);
  assert.equal(c.readiness.at(-1), true);
  assert.ok(c.video.currentTime > 5);
  c.playback.destroy();
});
test('intro transitions into scrolling without jumping backward to frame zero', async () => {
  const c = setup({ cached: true }); await Promise.resolve();
  c.video.time = 1.21; c.clock.step(); if (c.video.seeking) c.video.completeSeek();
  c.playback.setProgress(.005); settle(c);
  assert.ok(c.video.seeks.every(t => t >= 1.2));
  c.playback.destroy();
});
test('pause and reduced-motion freeze seeking, then resume the latest scroll target', () => {
  const c = setup({ cached: true, reduced: true });
  c.playback.setProgress(.6); settle(c);
  assert.equal(c.video.seeks.length, 0); assert.equal(c.video.playCalls, 0);
  c.playback.setReducedMotion(false); settle(c);
  c.playback.setPaused(true); const before = c.video.seeks.length;
  c.playback.setProgress(.9); settle(c); assert.equal(c.video.seeks.length, before);
  c.playback.setPaused(false); settle(c); assert.ok(c.video.currentTime > 9);
  c.playback.destroy();
});
test('network failure retries automatically and restores pending progress', () => {
  const c = setup(); c.playback.setProgress(.4);
  c.video.error = { code: 2 }; c.video.dispatchEvent(new Event('error'));
  c.clock.step(800); assert.equal(c.video.loadCalls, 1);
  c.video.becomeReady(); settle(c);
  assert.equal(c.readiness.at(-1), true); assert.ok(c.video.currentTime > 4);
  c.playback.destroy();
});
test('cleanup cancels retries, animation work and late playback completions', async () => {
  const c = setup({ cached: true });
  c.video.error = { code: 2 }; c.video.dispatchEvent(new Event('error'));
  c.playback.destroy(); await Promise.resolve(); c.clock.step(2000);
  assert.equal(c.video.loadCalls, 0); assert.equal(c.clock.frames.size, 0);
  c.video.becomeReady(); assert.equal(c.clock.frames.size, 0);
});

test('a cold-load first scroll progresses and catches up without a second scroll or media event', () => {
  const c = setup(); c.playback.setProgress(.75);
  for (let i = 0; i < 20; i++) c.clock.step();
  assert.ok(c.positions.at(-1) > .7, 'page motion responds while video is loading');
  // Simulate a decoder that becomes ready without another loadeddata/canplay event.
  c.video.duration = 10.042; c.video.readyState = 2;
  settle(c);
  assert.equal(c.readiness.at(-1), true);
  assert.ok(c.video.currentTime > 7.7);
  c.playback.destroy();
});

test('seek readiness dropping to HAVE_METADATA cannot strand the final target', () => {
  const c = setup({ cached: true }); c.playback.setProgress(.9); c.clock.step();
  c.video.readyState = 1;
  c.playback.setProgress(.65);
  for (let i = 0; i < 50; i++) c.clock.step();
  c.video.seeking = false; c.video.readyState = 2; // Deliberately omit seeked/canplay.
  settle(c);
  assert.ok(Math.abs(c.video.currentTime - (1.2 + (10.042 - .06 - 1.2) * .65)) < .025);
  c.playback.destroy();
});

test('a fractional restored scroll cannot strand the cold intro', async () => {
  const c = setup();
  c.playback.setProgress(.0003);
  c.video.becomeReady();
  await Promise.resolve();
  assert.equal(c.video.playCalls, 1);
  assert.equal(c.video.paused, false);
  c.playback.destroy();
});

test('obsolete play completion cannot pause a replacement controller', async () => {
  const video = new FakeVideo(), clock = new FakeClock(), completions = [];
  video.readyState = 4; video.duration = 10.042;
  video.play = () => { video.playCalls++; video.paused = false; return new Promise(resolve => completions.push(resolve)); };
  const callbacks = { onReady() {}, onProgress() {} };
  const old = createHeroPlayback(video, callbacks, { clock });
  old.destroy();
  const current = createHeroPlayback(video, callbacks, { clock });
  completions[1](); await Promise.resolve();
  const pauses = video.pauseCalls;
  completions[0](); await Promise.resolve();
  assert.equal(video.pauseCalls, pauses);
  assert.equal(video.paused, false);
  current.destroy();
});

test('browser-imposed pause resumes the intro on page restoration', async () => {
  const c = setup({ cached: true }); await Promise.resolve();
  c.video.pause();
  c.playback.resumeLoading(); await Promise.resolve();
  assert.equal(c.video.playCalls, 2);
  assert.equal(c.video.paused, false);
  c.playback.setActive(false);
  assert.equal(c.clock.frames.size, 0);
  c.playback.setActive(true); await Promise.resolve();
  assert.equal(c.video.paused, false);
  c.playback.destroy();
});

test('silent seek stall recovers without another scroll or media error', () => {
  const c = setup({ cached: true });
  c.playback.setProgress(.8); c.clock.step();
  for (let i = 0; i < 90; i++) c.clock.step(100);
  assert.equal(c.video.loadCalls, 1);
  c.video.becomeReady(); settle(c);
  assert.ok(Math.abs(c.video.currentTime - (1.2 + (10.042 - .06 - 1.2) * .8)) < .025);
  c.playback.destroy();
});

test('a rejected seek retries without depending on a new media event', () => {
  const c = setup({ cached: true }); let reject = true;
  Object.defineProperty(c.video, 'currentTime', {
    get() { return this.time; },
    set(value) { if (reject) { reject = false; throw new Error('decoder busy'); } this.time = value; this.seeking = true; },
  });
  c.playback.setProgress(.5); settle(c);
  assert.ok(c.video.currentTime > 5);
  c.playback.destroy();
});

test('switching to a cached full source preserves the latest scroll target', () => {
  const c = setup({ cached: true });
  c.playback.setProgress(.6); settle(c);
  c.playback.sourceChanged();
  c.video.becomeReady(); settle(c);
  assert.ok(Math.abs(c.video.currentTime - (1.2 + (10.042 - .06 - 1.2) * .6)) < .025);
  c.playback.destroy();
});

test('suspending cancels a queued recovery; a replacement source loads only once', () => {
  for (const action of ['setPaused', 'setActive', 'sourceChanged']) {
    const c = setup({ cached: true });
    c.playback.setProgress(.8); c.clock.step();
    for (let i = 0; i < 61; i++) c.clock.step(100);
    if (action === 'sourceChanged') c.playback.sourceChanged();
    else c.playback[action](action === 'setPaused');
    const loads = c.video.loadCalls;
    c.clock.step(1000);
    assert.equal(c.video.loadCalls, loads, action);
    c.playback.destroy();
  }
});

test('permanent decoder failure becomes idle after bounded recovery', () => {
  const c = setup(); c.playback.setProgress(.8);
  for (let i = 0; i < 300; i++) c.clock.step(100);
  assert.equal(c.video.loadCalls, 2);
  assert.equal(c.clock.frames.size, 0);
  assert.equal(c.clock.timers.size, 0);
  c.playback.resumeLoading(); c.video.becomeReady(); settle(c);
  assert.ok(c.video.currentTime > 8);
  c.playback.destroy();
});

test('continuous scroll cannot postpone recovery of a stuck decoder', () => {
  const c = setup({ cached: true });
  c.playback.setProgress(.8); c.clock.step();
  for (let i = 0; i < 85; i++) { c.playback.setProgress(i % 2 ? .7 : .8); c.clock.step(100); }
  assert.ok(c.video.loadCalls >= 1);
  c.video.becomeReady(); settle(c);
  assert.ok(c.video.currentTime > 7);
  c.playback.destroy();
});

test('an error while idle keeps monitoring the replacement load', () => {
  const c = setup({ cached: true }); c.playback.setProgress(.5); settle(c);
  c.video.error = { code: 2 }; c.video.dispatchEvent(new Event('error'));
  c.clock.step(800);
  assert.equal(c.video.loadCalls, 1);
  assert.ok(c.clock.frames.size + c.clock.timers.size > 0);
  c.video.readyState = 2; c.video.duration = 10.042; // no readiness event
  settle(c);
  assert.ok(c.video.currentTime > 5);
  c.playback.destroy();
});

test('five separate transient errors can each recover after successful decoding', () => {
  const c = setup({ cached: true }); c.playback.setProgress(.5); settle(c);
  for (let i = 0; i < 5; i++) {
    c.video.error = { code: 2 }; c.video.dispatchEvent(new Event('error'));
    c.clock.step(800);
    assert.equal(c.video.loadCalls, i + 1);
    c.video.becomeReady(); settle(c);
  }
  c.playback.setProgress(.9); settle(c);
  assert.ok(c.video.currentTime > 9);
  c.playback.destroy();
});

test('reported seek position cannot conceal a frozen displayed frame', () => {
  const video = new FakeVideo(), clock = new FakeClock(), callbacks = new Map();
  let id = 0;
  video.readyState = 4; video.duration = 10.042;
  video.requestVideoFrameCallback = fn => { callbacks.set(++id, fn); return id; };
  video.cancelVideoFrameCallback = key => callbacks.delete(key);
  const playback = createHeroPlayback(video, { onReady() {}, onProgress() {} }, { clock });
  playback.setProgress(.7);
  for (let i = 0; i < 80; i++) {
    clock.step(100);
    if (video.seeking) video.completeSeek(); // position says success; no displayed frame arrives
  }
  assert.equal(video.loadCalls, 1);
  playback.setActive(false);
  const loads = video.loadCalls;
  for (let i = 0; i < 100; i++) clock.step(100);
  assert.equal(video.loadCalls, loads, 'offscreen media must not trigger false stall recovery');
  assert.equal(callbacks.size, 0);
  playback.setActive(true);
  assert.equal(callbacks.size, 1);
  playback.destroy();
  assert.equal(callbacks.size, 0);
});

test('a new scroll after healthy idle time gets a fresh decode deadline', () => {
  const video = new FramedVideo(), clock = new FakeClock(); let stalls = 0;
  video.readyState = 4; video.duration = 10.042;
  const playback = createHeroPlayback(video, { onReady() {}, onProgress() {}, onStall() { stalls++; } }, { clock });
  playback.setProgress(.5);
  for (let i = 0; i < 100; i++) { clock.step(); video.completeSeek(); video.present(); }
  clock.step(15000);
  playback.setProgress(.8); clock.step();
  assert.equal(stalls, 0);
  assert.equal(video.loadCalls, 0);
  playback.destroy();
});

test('a reload first frame cannot conceal repeated frozen scroll seeks', () => {
  const video = new FramedVideo(), clock = new FakeClock();
  video.readyState = 4; video.duration = 10.042;
  const playback = createHeroPlayback(video, { onReady() {}, onProgress() {} }, { clock });
  playback.setProgress(.8); let loads = 0;
  for (let i = 0; i < 600; i++) {
    clock.step(100);
    if (video.loadCalls > loads) { loads = video.loadCalls; video.becomeReady(); video.present(0); }
    if (video.seeking) video.completeSeek();
  }
  assert.equal(video.loadCalls, 2);
  assert.equal(clock.frames.size + clock.timers.size, 0);
  playback.destroy();
});

test('scroll-only mode remains still without playing and follows input immediately', () => {
  const c = setup({cached:true,intro:false}); settle(c);
  const first=c.video.currentTime; assert.equal(c.video.playCalls,0);
  settle(c); assert.equal(c.video.currentTime,first);
  c.playback.setProgress(.75); settle(c);
  assert.ok(c.video.currentTime>7); assert.equal(c.video.playCalls,0);
  c.playback.destroy();
});
