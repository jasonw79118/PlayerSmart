import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_NEON_AUTH_URL': JSON.stringify(''),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20000,
    // Local workspace stores and browser globals must not leak between test files.
    isolate: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
