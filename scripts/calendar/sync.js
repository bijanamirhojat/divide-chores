import 'dotenv/config'
import process from 'node:process'
import { getConfig } from '../../api/config.js'
import { createDatabaseClient } from '../../api/db.js'
import { syncCalendarSources } from '../../api/calendar/sync.js'

function getArgValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] || null
}

async function main() {
  const config = getConfig()
  const db = createDatabaseClient(config)

  const result = await syncCalendarSources(db, {
    sourceId: getArgValue('--source-id') || undefined,
    provider: getArgValue('--provider') || undefined,
  })

  console.log(JSON.stringify(result, null, 2))

  if (result.error_count > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Calendar sync failed')
  console.error(error.message)
  process.exitCode = 1
})
