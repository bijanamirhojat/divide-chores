import { jsonError } from '../utils.js'

export function inboundMailAuth() {
  return async (c, next) => {
    const expected = process.env.INBOUND_MAIL_SECRET
    if (!expected) {
      return jsonError(c, 500, 'INBOUND_MAIL_SECRET is not configured')
    }

    const header = c.req.header('authorization')
    if (!header?.startsWith('Bearer ')) {
      return jsonError(c, 401, 'Missing inbound mail secret')
    }

    const token = header.slice('Bearer '.length).trim()
    if (!token || token !== expected) {
      return jsonError(c, 401, 'Invalid inbound mail secret')
    }

    await next()
  }
}
