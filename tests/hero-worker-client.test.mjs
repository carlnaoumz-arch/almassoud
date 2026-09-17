import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const sourceUrl = new URL('../lib/hero-worker-client.ts', import.meta.url);
const source = (await readFile(sourceUrl, 'utf8'))
  .replace("import HeroWorker from './hero-worker?worker';", "const HeroWorker = class { constructor() { return new globalThis.Worker(); } };")
  .replace("'./hero-frames'", JSON.stringify(new URL('../lib/hero-frames.ts', import.meta.url).href))
  .replaceAll('import.meta.url', JSON.stringify(sourceUrl.href));
const compiled = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
const { createPhoneHero } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
function setup(t, withWorker = true) {
  const previous = new Map(), frames = new Map(), workers = [], paints = [], seen = [], engines = []; let id = 0;
  const override = (key, value) => { previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}); };
  override('window',globalThis);
  override('requestAnimationFrame',fn=>{frames.set(++id,fn);return id;});
  override('cancelAnimationFrame',id=>frames.delete(id));
  override('OffscreenCanvas',class {});
  override('Worker',withWorker ? class {
    messages=[]; terminated=false;
    constructor(){workers.push(this);}
    postMessage(data){this.messages.push(data);}
    terminate(){this.terminated=true;}
  } : undefined);
  override('fetch',async()=>new Response(new Uint8Array([1]),{headers:{'content-type':'image/webp'}}));
  override('createImageBitmap',async()=>({close(){}}));
  const player=createPhoneHero({drawImage:(...args)=>paints.push(args)}, {
    onReady:()=>seen.push('ready'),onProgress:p=>seen.push(p),onFrame:i=>seen.push(i),onRenderer:m=>engines.push(m),
  });
  t.after(()=>{player.destroy();for(const [key,desc] of previous){if(desc)Object.defineProperty(globalThis,key,desc);else delete globalThis[key];}});
  const step=()=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(performance.now()));};
  return {player,workers,paints,seen,engines,step,frames};
}
test('worker frames paint once per browser frame and obsolete bitmaps are closed', t=>{
  const c=setup(t), w=c.workers[0]; let closed=0;
  w.onmessage({data:{type:'frame',index:1,bitmap:{close(){closed++;}}}});
  w.onmessage({data:{type:'frame',index:2,bitmap:{close(){closed++;}}}});
  assert.equal(c.paints.length,0);assert.equal(closed,1);
  c.step();assert.equal(c.paints.length,1);assert.equal(closed,2);
  assert.equal(c.seen.filter(x=>x==='ready').length,1);
  assert.equal(w.messages.at(-1).type,'ack');
  c.player.setProgress(.8);assert.deepEqual(w.messages.at(-1),{type:'progress',value:.8});
});
test('page cleanup terminates the worker and discards queued and late images', t=>{
  const c=setup(t),w=c.workers[0];let closed=0;
  w.onmessage({data:{type:'frame',index:1,bitmap:{close(){closed++;}}}});
  c.player.destroy();c.step();assert.equal(c.paints.length,0);assert.equal(closed,1);assert.ok(w.terminated);
  w.onmessage({data:{type:'frame',index:2,bitmap:{close(){closed++;}}}});
  assert.equal(closed,2);assert.equal(c.paints.length,0);
});
test('phones without worker canvas use the same images and remain scroll controlled',async t=>{
  const c=setup(t,false);assert.deepEqual(c.engines,['main']);
  for(let i=0;i<50;i++){await new Promise(resolve=>setTimeout(resolve,1));c.step();}
  assert.ok(c.paints.length>0);const count=c.paints.length;
  c.step();c.step();assert.equal(c.paints.length,count);
  c.player.setProgress(.8);
  for(let i=0;i<60;i++){await new Promise(resolve=>setTimeout(resolve,2));c.step();}
  assert.ok(c.paints.length>count);
});
