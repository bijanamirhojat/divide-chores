import 'dotenv/config'
import crypto from 'node:crypto'
import process from 'node:process'
import { getConfig } from '../../api/config.js'
import { createDatabaseClient } from '../../api/db.js'
import { hashToken } from '../../api/utils.js'

function getArgValue(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] || null
}

async function main() {
  const label = getArgValue('--label') || 'local-generated-token'
  const rawToken = crypto.randomBytes(24).toString('base64url')
  const config = getConfig()
  const db = createDatabaseClient(config)

  const { data, error } = await db
    .from('api_tokens')
    .insert({
      label,
      token_hash: hashToken(rawToken),
    })
    .select('id, label, created_at')
    .single()

  if (error) {
    throw error
  }

  console.log('API token created')
  console.log(`id: ${data.id}`)
  console.log(`label: ${data.label}`)
  console.log(`created_at: ${data.created_at}`)
  console.log(`token: ${rawToken}`)
}

main().catch((error) => {
  console.error('Failed to create API token')
  if (error.message?.includes("Could not find the table 'public.api_tokens'")) {
    console.error('The Life OS migration has not been applied yet. Run the SQL in supabase/migrations/20260530_life_os_foundation.sql against your Supabase project first.')
  }
  console.error(error.message)
  process.exitCode = 1
})
