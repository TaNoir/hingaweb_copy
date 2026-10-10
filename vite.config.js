import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Phase 03 adds vite-plugin-pwa here. Do not add it earlier.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}', 'supabase/functions/_shared/**/*.test.js', 'scripts/**/*.test.js'],
  },
});
