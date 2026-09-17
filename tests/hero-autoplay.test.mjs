import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeroAutoplay } from '../lib/hero-autoplay.ts';
class Clock {
  time = 0; id = 0; frames = new Map();
  now = () => this.time;
  requestFrame = fn => { this.frames.set(++this.id, fn); return this.id; };
  cancelFrame = id => this.frames.delete(id);
  step(count = 1) { for (let i = 0; i < count; i++) { this.time += 16; const jobs = [...this.frames.values()]; this.frames.clear(); jobs.forEach(fn => fn(this.time)); } }
}
function setup() { const clock = new Clock(), values = []; return {clock, values, player:createHeroAutoplay(p=>values.push(p),clock)}; }
test('automatically plays original sequence forward and back once ready, without input', () => {
  const c = setup(); c.clock.step(10); assert.equal(c.values.length,0);
  c.player.setReady(true); c.clock.step(540); assert.ok(c.values.at(-1)>.98);
  c.clock.step(540); assert.ok(c.values.at(-1)<.04);
  c.clock.step(100); assert.ok(c.values.at(-1)>.1);
  assert.ok(c.values.every(p=>p>=0&&p<=1)); c.player.destroy();
});
test('scroll takes over immediately and returning to the top restarts autoplay', () => {
  const c = setup(); c.player.setReady(true); c.clock.step(50);
  c.player.setScrollProgress(.6); const count=c.values.length; c.clock.step(60);
  assert.equal(c.values.length,count); assert.equal(c.values.at(-1),.6);
  c.player.setScrollProgress(.2); assert.equal(c.values.at(-1),.2);
  c.player.setScrollProgress(0); c.clock.step(20); assert.ok(c.values.at(-1)>0); c.player.destroy();
});
test('hidden pages stop work and resume without jumping after a long absence', () => {
  const c = setup(); c.player.setReady(true); c.clock.step(20);
  c.player.setActive(false); const count=c.values.length, before=c.values.at(-1);
  c.clock.step(3000); assert.equal(c.values.length,count); assert.equal(c.clock.frames.size,0);
  c.player.setActive(true); c.clock.step(); assert.ok(c.values.at(-1)-before<.003);
  c.player.destroy(); c.clock.step(100); assert.equal(c.clock.frames.size,0);
  c.player.setActive(true); c.player.setReady(true); assert.equal(c.clock.frames.size,0);
});
