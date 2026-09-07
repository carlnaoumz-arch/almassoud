// Preload and fetch use the same URL so the full response is shared by the browser.
export const HERO_VIDEO_URL = '/farrouj-assembly.mp4?delivery=complete-v1';
let pending: Promise<Blob> | undefined;

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
      if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('video/')) {
        throw new Error('Complete video response unavailable');
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error('Empty video response');
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
