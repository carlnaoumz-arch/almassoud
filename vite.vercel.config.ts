import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Vercel needs its own server functions and routing manifest, rather than the
// Cloudflare Worker emitted by the original hosting configuration.
export default defineConfig({
  plugins: [tailwindcss(), vinext(), nitro({
    preset: 'vercel',
    routeRules: { '/farrouj-mobile-hd-v1.mp4': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      '/farrouj-mobile-fallback-v1.webp': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      '/farrouj-mobile-poster-v1.jpg': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }, '/hero-mobile-v2/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } } },
  })],
});
