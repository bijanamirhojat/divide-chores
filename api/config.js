import 'dotenv/config'

function firstDefined(...values) {
  return values.find((value) => !!value)
}

export function getConfig() {
  const supabaseUrl = firstDefined(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL)
  const supabaseServiceRoleKey = firstDefined(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_KEY)
  const missing = []

  if (!supabaseUrl) missing.push('SUPABASE_URL or VITE_SUPABASE_URL')
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return {
    port: Number(process.env.PORT || 8787),
    supabaseUrl,
    supabaseServiceRoleKey,
  }
}
