import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Vercel needs its own server functions and routing manifest, rather than the
// Cloudflare Worker emitted by the original hosting configuration.
export default defineConfig({
  plugins: [tailwindcss(), vinext(), nitro({ preset: 'vercel' })],
});
