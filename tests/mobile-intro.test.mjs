import test from 'node:test';
import assert from 'node:assert/strict';
import { createMobileIntro } from '../lib/mobile-intro.ts';
class Video extends EventTarget {
  muted=false;defaultMuted=false;playsInline=false;autoplay=false;loop=true;
  paused=true;readyState=4;time=0;complete=false;calls=0;reject;
  get ended(){return this.complete;}
  get currentTime(){return this.time;}
  set currentTime(value){this.time=value;this.complete=false;}
  play(){this.calls++;if(this.reject)return Promise.reject(this.reject);this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  event(name){this.dispatchEvent(new Event(name));}
}
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
function setup(video=new Video()){
  const states=[],jobs=new Map();let id=0,ready=0,fallback=0;
  const intro=createMobileIntro(video,{onReady:()=>ready++,onFallback:()=>fallback++,onState:s=>states.push(s)},
    {set:fn=>{jobs.set(++id,fn);return id;},clear:id=>jobs.delete(id)});
  return {video,intro,states,jobs,ready:()=>ready,fallback:()=>fallback};
}
test('starts silently without user input and finishes once without looping',async()=>{
  const c=setup();await flush();assert.equal(c.video.calls,1);
  assert.ok(c.video.muted&&c.video.defaultMuted&&c.video.playsInline&&c.video.autoplay);
  assert.equal(c.video.loop,false);assert.ok(c.ready()>0);
  c.video.complete=true;c.video.event('ended');assert.equal(c.states.at(-1),'complete');assert.equal(c.jobs.size,0);
  c.intro.setActive(false);c.intro.setActive(true);assert.equal(c.video.calls,1);
  c.intro.restart();await flush();assert.equal(c.video.calls,2);assert.equal(c.video.currentTime,0);c.intro.destroy();
});
test('autoplay rejection selects the animated fallback without any button',async()=>{
  const video=new Video();video.reject={name:'NotAllowedError'};const c=setup(video);await flush();
  assert.equal(c.fallback(),1);assert.equal(c.states.at(-1),'fallback');assert.ok(video.paused);
  video.event('canplay');assert.equal(video.calls,1);c.intro.destroy();
});
test('hidden pages suspend and then continue without competing play requests',async()=>{
  const c=setup();await flush();c.video.currentTime=.7;c.intro.setActive(false);assert.ok(c.video.paused);assert.equal(c.jobs.size,0);
  c.intro.setActive(true);c.video.event('canplay');await flush();assert.equal(c.video.calls,2);assert.equal(c.video.currentTime,.7);c.intro.destroy();
});
test('a stalled ready decoder uses the fallback while ordinary time updates reset the deadline',async()=>{
  const c=setup();await flush();const initial=[...c.jobs.keys()][0];c.video.event('timeupdate');assert.ok(!c.jobs.has(initial));
  [...c.jobs.values()][0]();assert.equal(c.fallback(),1);c.intro.destroy();
});
test('late autoplay rejection after leaving the page does not affect its replacement',async()=>{
  const video=new Video();let reject;video.play=()=>new Promise((_,r)=>{reject=r;});
  const c=setup(video);c.intro.destroy();reject({name:'NotAllowedError'});await flush();assert.equal(c.fallback(),0);assert.equal(c.jobs.size,0);
});
test('already completed native playback is shown after hydration without replay',()=>{
  const video=new Video();video.complete=true;const c=setup(video);
  assert.equal(c.states.at(-1),'complete');assert.equal(video.calls,0);assert.equal(c.ready(),1);c.intro.destroy();
});

test('ordinary slow-network buffering does not download the larger image fallback',async()=>{
  const c=setup();await flush();c.video.readyState=2;
  [...c.jobs.values()][0]();assert.equal(c.fallback(),0);
  c.video.event('waiting');assert.equal(c.jobs.size,0);
  c.video.readyState=4;c.video.event('canplay');await flush();
  assert.equal(c.states.at(-1),'playing');assert.equal(c.fallback(),0);c.intro.destroy();
});
