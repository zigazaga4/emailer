import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Set base to relative path for Electron compatibility
  base: './',
  // Configure build output
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Configure server for development
  server: {
    port: 5173,
    strictPort: true,
  },
})
