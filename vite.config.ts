import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' keeps every asset path relative, so the same build works at
// https://<user>.github.io/<repo>/ and on a local preview server.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Sage — workout coach & timer',
        short_name: 'Sage',
        description: 'A calm routine builder, coach and visual workout timer.',
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#F6F1EA',
        theme_color: '#F6F1EA',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        globIgnores: ['**/splash/**'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
