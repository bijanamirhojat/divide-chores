import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Take control immediately
self.skipWaiting()
clientsClaim()

// Clean old caches and precache build assets
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Runtime caching: Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })
    ]
  })
)

// Runtime caching: JS/CSS — network first
registerRoute(
  /\.(?:js|css)$/,
  new NetworkFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50 })
    ]
  })
)

// Runtime caching: HTML — network first
registerRoute(
  /\.html$/,
  new NetworkFirst({
    cacheName: 'html-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10 })
    ]
  })
)

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Divide/Chores', body: event.data.text() }
  }

  const title = data.title || 'Divide/Chores'
  const options = {
    body: data.body || '',
    icon: '/divide-chores/app_icon.jpeg',
    badge: '/divide-chores/app_icon.jpeg',
    data: {
      url: data.url || '/divide-chores/'
    }
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click — focus or open window
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/divide-chores/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if found
      for (const client of clientList) {
        if (client.url.includes('/divide-chores/') && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(targetUrl)
    })
  )
})
