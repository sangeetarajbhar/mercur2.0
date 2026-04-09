import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mercurDashboardPlugin } from '@mercurjs/dashboard-sdk'

export default defineConfig({
  plugins: [
    react(),
    mercurDashboardPlugin({
      medusaConfigPath: '../../packages/api/medusa-config.ts',
    }),
  ],
  server: {
    proxy: {
      '/admin': {
        target: 'http://localhost:9000', // your medusa backend port
        changeOrigin: true,
      },
    },
  },
})