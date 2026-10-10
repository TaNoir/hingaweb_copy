import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Phase 03 · 2.1.6.4.6: the app shell (and with it the static hotline and directory content)
    // is precached so it opens with no network. NOTHING from Supabase is ever cached:
    // there is no runtimeCaching, so every API call goes to the network.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false, // not an installable app (no app install, manuscript 1.2)
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    // Phase 10 · scripts/check-bundle.js reads this manifest to measure each core view's first
    // load. The real budget (2.1.6.1.2) is 500 KB COMPRESSED and is enforced there; this raw-size
    // warning limit only keeps the build log quiet about the uncompressed main chunk.
    manifest: true,
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}', 'supabase/functions/**/*.test.js', 'scripts/**/*.test.js'],
  },
});
