import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { getConfig } from './config.js'
import { createDatabaseClient } from './db.js'

const config = getConfig()
const db = createDatabaseClient(config)
const app = createApp({ db })

serve({
  fetch: app.fetch,
  port: config.port,
})

console.log(`API listening on http://localhost:${config.port}`)
