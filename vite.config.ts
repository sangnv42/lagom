import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static reconstruction: SPA with client-side rendering + runtime head updates (SEO layer).
// Deep-link reloads rely on the standard SPA history fallback (vite dev/preview and any
// static host configured with index.html fallback).
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  server: { port: 5173 },
});
