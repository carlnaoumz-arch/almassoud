import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCompleteVideo } from '../lib/hero-source.ts';

test('does not expose a source until every original byte has arrived', async () => {
  let finish;
  const original = new Uint8Array([0, 255, 17, 92, 100]);
  const loading = fetchCompleteVideo(async () => ({
    status: 200, headers: new Headers({ 'content-type': 'video/mp4' }),
    blob: () => new Promise(resolve => { finish = () => resolve(new Blob([original], { type: 'video/mp4' })); }),
  }));
  let resolved = false; loading.then(() => { resolved = true; });
  await Promise.resolve(); assert.equal(resolved, false);
  finish(); const blob = await loading;
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), original, 'quality is preserved byte-for-byte');
});

test('automatically retries partial and failed cold requests before using the complete response', async () => {
  let attempts = 0;
  const result = await fetchCompleteVideo(async () => {
    attempts++;
    if (attempts === 1) throw new Error('Network disconnected');
    if (attempts === 2) return new Response('partial', { status: 206, headers: { 'content-type': 'video/mp4' } });
    return new Response('complete original data', { headers: { 'content-type': 'video/mp4' } });
  }, async () => {});
  assert.equal(attempts, 3); assert.equal(await result.text(), 'complete original data');
});

test('never treats an authentication page as a video and bounds automatic retries', async () => {
  let attempts = 0;
  await assert.rejects(fetchCompleteVideo(async () => { attempts++; return new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } }); }, async () => {}));
  assert.equal(attempts, 3);
});
