import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  root: '..',
  publicDir: 'frontend/public',
  plugins: [react()],
})
