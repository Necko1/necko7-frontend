import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || env.VITE_BACKEND_URL || 'https://7.necko.moe'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    // Expose API_* and BACKEND_* to client-side import.meta.env directly
    envPrefix: ['VITE_', 'API_', 'BACKEND_'],
    server: {
      proxy: {
        // In dev: proxy /api/* → backendUrl/api/*
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: 'localhost',
        },
      },
    },
  }
})
