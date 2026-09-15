// A versioned complete response avoids cached partial range responses.
export const HERO_VIDEO_URL = '/farrouj-assembly.mp4?delivery=complete-v1';
export const HERO_CACHE = 'al-massoud-hero-v1';
let pending: Promise<Blob> | undefined;
let cachedUrl: string | undefined;
let preparing: Promise<string> | undefined;

export async function fetchCompleteVideo(
  fetcher: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<Blob> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetcher(HERO_VIDEO_URL, {
        credentials: 'same-origin', mode: 'cors', cache: 'force-cache', priority: 'high',
      });
      // Never turn a partial response or a sign-in/error HTML page into a video source.
      const mime = response.headers.get('content-type')?.split(';')[0].trim();
      if (response.status !== 200 || !(mime?.startsWith('video/') || mime === 'application/octet-stream' || mime === 'binary/octet-stream')) {
        throw new Error('Complete video response unavailable');
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error('Empty video response');
      if (!mime?.startsWith('video/')) {
        const signature = new TextDecoder().decode(await blob.slice(4, 8).arrayBuffer());
        if (signature !== 'ftyp') throw new Error('Response is not an MP4');
      }
      return blob;
    } catch (error) {
      if (attempt >= 2) throw error;
      await wait(500 * (attempt + 1));
    }
  }
}

export function getCompleteHeroVideo() {
  if (!pending) pending = readCachedHero().then(async cached => {
    if (cached) return cached;
    const blob = await fetchCompleteVideo();
    // Store complete bytes across normal page loads; storage failure must not
    // prevent playback or navigation (private browsing and quota restrictions).
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(HERO_CACHE);
        await cache.put(HERO_VIDEO_URL, new Response(blob, { headers: { 'content-type': 'video/mp4' } }));
      } catch { /* Streaming remains available. */ }
    }
    return blob;
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}

export async function readCachedHero(storage: CacheStorage | undefined = typeof caches === 'undefined' ? undefined : caches) {
  try {
    if (!storage) return undefined;
    const response = await (await storage.open(HERO_CACHE)).match(HERO_VIDEO_URL);
    if (!response || response.status !== 200 || !response.headers.get('content-type')?.startsWith('video/')) return undefined;
    const blob = await response.blob();
    return blob.size ? blob : undefined;
  } catch { return undefined; }
}

// Retain one object URL per document. Persistent bytes are restored separately
// after native navigation, without making page links depend on a JS router.
export function peekHeroSource() { return cachedUrl; }
export function prepareHeroSource() {
  if (!preparing) preparing = getCompleteHeroVideo().then(blob => {
    cachedUrl ??= URL.createObjectURL(blob);
    return cachedUrl;
  }).catch(error => { preparing = undefined; throw error; });
  return preparing;
}
export function pendingHeroSource() { return preparing; }

export async function restoreHeroSource() {
  if (cachedUrl) return cachedUrl;
  const blob = await readCachedHero();
  if (blob) cachedUrl ??= URL.createObjectURL(blob);
  return cachedUrl;
}
