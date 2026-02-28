import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

const buildTimestamp = Date.now()
const buildId = buildTimestamp.toString(36).slice(-6)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'app_icon.jpeg'],
      manifest: {
        name: 'Divide/Chores',
        short_name: 'Divide/Chores',
        description: 'Takenlijst app voor het huishouden',
        start_url: '/divide-chores/',
        display: 'standalone',
        background_color: '#FEFDFB',
        theme_color: '#A7F3D0',
        icons: [
          {
            src: '/app_icon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/app_icon.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 50, maxAgeSeconds: 0 }
            }
          },
          {
            urlPattern: /\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 0 }
            }
          }
        ]
      }
    })
  ],
  base: '/divide-chores/',
  define: {
    'import.meta.env.BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.BUILD_ID': JSON.stringify(buildId)
  }
})
