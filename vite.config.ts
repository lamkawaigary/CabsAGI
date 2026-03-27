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
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/') ||
            id.includes('/node_modules/react-router-dom/') ||
            id.includes('/node_modules/@remix-run/')
          ) {
            return 'vendor-react'
          }
          if (
            id.includes('/node_modules/firebase/') ||
            id.includes('/node_modules/@firebase/') ||
            id.includes('/node_modules/idb/')
          ) {
            return 'vendor-firebase'
          }
          if (id.includes('/node_modules/leaflet/')) return 'vendor-map'

          return 'vendor-misc'
        },
      },
    },
  },
})
