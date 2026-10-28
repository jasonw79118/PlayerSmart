import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/PlayerSmart/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/askref': 'http://127.0.0.1:5188',
      '/api': 'http://127.0.0.1:4180',
    },
  },
})
