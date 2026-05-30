import test from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../api/app.js'
import { hashToken } from '../api/utils.js'

function createQueryBuilder(state, table) {
  const operations = { filters: [], order: [], select: '*' }

  const builder = {
    select(value) {
      operations.select = value
      return builder
    },
    insert(payload) {
      state.lastInsert = { table, payload }
      return {
        select() {
          return {
            single: async () => ({ data: { id: 'new-id', ...payload }, error: null }),
          }
        },
      }
    },
    update(payload) {
      state.lastUpdate = { table, payload }
      return {
        eq(column, value) {
          state.lastUpdate.match = { column, value }
          return {
            select() {
              return {
                single: async () => ({ data: { id: value, ...payload }, error: null }),
              }
            },
            then: undefined,
          }
        },
      }
    },
    delete() {
      state.lastDelete = { table }
      return {
        eq(column, value) {
          state.lastDelete.match = { column, value }
          return Promise.resolve({ error: null })
        },
      }
    },
    eq(column, value) {
      operations.filters.push({ type: 'eq', column, value })
      return builder
    },
    gte(column, value) {
      operations.filters.push({ type: 'gte', column, value })
      return builder
    },
    lte(column, value) {
      operations.filters.push({ type: 'lte', column, value })
      return builder
    },
    contains(column, value) {
      operations.filters.push({ type: 'contains', column, value })
      return builder
    },
    not(column, operator, value) {
      operations.filters.push({ type: 'not', column, operator, value })
      return builder
    },
    is(column, value) {
      operations.filters.push({ type: 'is', column, value })
      return builder
    },
    order(column, options = {}) {
      operations.order.push({ column, options })
      return builder
    },
    single: async () => ({ data: state.single?.[table] || null, error: null }),
    maybeSingle: async () => ({ data: state.maybeSingle?.[table] || null, error: null }),
    then(resolve, reject) {
      return Promise.resolve({ data: state.rows?.[table] || [], error: null }).then(resolve, reject)
    },
  }

  state.queries.push({ table, operations })
  return builder
}

function createMockDb(overrides = {}) {
  const state = {
    queries: [],
    rows: overrides.rows || {},
    maybeSingle: overrides.maybeSingle || {},
    single: overrides.single || {},
  }

  return {
    state,
    client: {
      from(table) {
        return createQueryBuilder(state, table)
      },
    },
  }
}

test('health endpoint is public', async () => {
  const { client } = createMockDb()
  const app = createApp({ db: client })
  const res = await app.request('/api/health')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { status: 'ok' })
})

test('protected endpoint requires bearer token', async () => {
  const { client } = createMockDb()
  const app = createApp({ db: client })
  const res = await app.request('/api/tasks')
  assert.equal(res.status, 401)
})

test('lists tasks with auth', async () => {
  const token = 'test-token'
  const { client, state } = createMockDb({
    maybeSingle: { api_tokens: { id: 'token-id', label: 'test' } },
    rows: { tasks: [{ id: 'task-1', title: 'Vacuum' }] },
  })
  const app = createApp({ db: client })
  const res = await app.request('/api/tasks', {
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), [{ id: 'task-1', title: 'Vacuum' }])

  const tokenLookup = state.queries.find((query) => query.table === 'api_tokens')
  assert.equal(tokenLookup.operations.filters[0].column, 'token_hash')
  assert.equal(tokenLookup.operations.filters[0].value, hashToken(token))
})

test('creates person and normalizes tags', async () => {
  const { client, state } = createMockDb({
    maybeSingle: { api_tokens: { id: 'token-id', label: 'test' } },
  })
  const app = createApp({ db: client })
  const res = await app.request('/api/people', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ name: 'Noor', tags: 'family, child, ' }),
  })

  assert.equal(res.status, 201)
  assert.deepEqual(state.lastInsert.payload.tags, ['family', 'child'])
})

test('life events include derived birthdays from people', async () => {
  const { client } = createMockDb({
    maybeSingle: { api_tokens: { id: 'token-id', label: 'test' } },
    rows: {
      life_events: [{ id: 'event-1', title: 'APK', event_type: 'renewal', event_date: '2026-06-15', recurrence_type: 'yearly', status: 'active' }],
      people: [{ id: 'person-1', name: 'Noor', birthdate: '2020-07-10', notes: 'Taart!' }],
    },
  })
  const app = createApp({ db: client })
  const res = await app.request('/api/life-events', {
    headers: { authorization: 'Bearer test-token' },
  })

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.length, 2)
  assert.equal(body.some((item) => item.derived_from === 'people.birthdate' && item.event_type === 'birthday'), true)
})
