import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCompleteVideo, readCachedHero } from '../lib/hero-source.ts';

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

test('accepts an intact MP4 served as application/octet-stream', async () => {
  const bytes = new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109]);
  const blob = await fetchCompleteVideo(async () => new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }));
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
});

test('does not mistake generic binary HTML for an MP4', async () => {
  await assert.rejects(fetchCompleteVideo(async () => new Response('<html>Not a video</html>', { headers: { 'content-type': 'application/octet-stream' } }), async () => {}));
});

test('restores complete video bytes across page loads without a network fetch', async () => {
  const original = new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112]);
  const storage = { open: async () => ({ match: async () => new Response(original, { headers: { 'content-type': 'video/mp4' } }) }) };
  const blob = await readCachedHero(storage);
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), original);
});

test('blocked storage and invalid cached responses leave normal playback available', async () => {
  assert.equal(await readCachedHero({ open: async () => { throw new Error('Storage unavailable'); } }), undefined);
  for (const response of [new Response('Sign in', { headers: { 'content-type': 'text/html' } }), new Response('part', { status: 206, headers: { 'content-type': 'video/mp4' } })]) {
    assert.equal(await readCachedHero({ open: async () => ({ match: async () => response }) }), undefined);
  }
});
