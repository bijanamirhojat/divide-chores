import crypto from 'node:crypto'

export function jsonError(c, status, message, details) {
  return c.json({ error: { message, details: details || null } }, status)
}

export function normalizeTags(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean)
  }
  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function normalizeIntegerArray(value) {
  if (!value) return []
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item))
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function pickDefined(input, keys) {
  const output = {}
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      output[key] = input[key]
    }
  }
  return output
}
