import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (
            id.includes('/react/') ||
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            id.includes('react-router-dom') ||
            id.includes('@remix-run')
          ) {
            return 'vendor-react'
          }
          if (id.includes('/firebase/')) return 'vendor-firebase'
          if (id.includes('/leaflet/')) return 'vendor-map'

          return 'vendor-misc'
        },
      },
    },
  },
})
