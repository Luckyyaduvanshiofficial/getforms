import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode: _mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3001',
      // Anchored to /f/ so it does not swallow the SPA routes /forms and
      // /forms/create. A bare '/f' prefix proxies those to the backend, which
      // serves the stale production index.html and leaves the page blank.
      '^/f/': 'http://localhost:3001',
    },
  },
  build: {
    minify: 'esbuild', // Use esbuild (faster) instead of terser
    target: 'es2020',
  },
  esbuild: {
    legalComments: 'none',
  },
}))
