import { hashToken, jsonError } from './utils.js'

export function apiAuth() {
  return async (c, next) => {
    const header = c.req.header('authorization')
    if (!header?.startsWith('Bearer ')) {
      return jsonError(c, 401, 'Missing API token')
    }

    const token = header.slice('Bearer '.length).trim()
    if (!token) {
      return jsonError(c, 401, 'Missing API token')
    }

    const tokenHash = hashToken(token)
    const db = c.get('db')
    const { data, error } = await db
      .from('api_tokens')
      .select('id, label, revoked_at')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .maybeSingle()

    if (error || !data) {
      return jsonError(c, 401, 'Invalid API token')
    }

    await db
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    c.set('apiToken', data)
    await next()
  }
}
