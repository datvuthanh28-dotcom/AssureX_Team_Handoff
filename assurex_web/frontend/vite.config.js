import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  root: '../..',
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: 'assurex_web/frontend/public',
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'assurex_web/dist',
  },
  plugins: [react()],
})
