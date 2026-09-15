// Preload and fetch use the same URL so the full response is shared by the browser.
export const HERO_VIDEO_URL = '/farrouj-assembly.mp4?delivery=complete-v1';
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
  if (!pending) pending = fetchCompleteVideo().catch(error => { pending = undefined; throw error; });
  return pending;
}

// Retain one complete source across client navigation. The browser releases it
// with the document; revoking it on a route unmount would break a returning hero.
export function peekHeroSource() { return cachedUrl; }
export function prepareHeroSource() {
  if (!preparing) preparing = getCompleteHeroVideo().then(blob => {
    cachedUrl = URL.createObjectURL(blob);
    return cachedUrl;
  }).catch(error => { preparing = undefined; throw error; });
  return preparing;
}
export function pendingHeroSource() { return preparing; }
