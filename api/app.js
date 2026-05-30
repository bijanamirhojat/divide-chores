import { Hono } from 'hono'
import { apiAuth } from './auth.js'
import { openApiDocument, renderSwaggerUi } from './openapi.js'
import { jsonError, normalizeIntegerArray, normalizeTags, pickDefined } from './utils.js'

function toDateString(date) {
  return date.toISOString().slice(0, 10)
}

function getNextYearlyOccurrence(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let occurrence = new Date(now.getFullYear(), month - 1, day)
  if (occurrence < today) {
    occurrence = new Date(now.getFullYear() + 1, month - 1, day)
  }
  return toDateString(occurrence)
}

function deriveBirthdayEvents(peopleRows) {
  return peopleRows
    .filter((person) => !!person.birthdate)
    .map((person) => ({
      id: `person-birthday-${person.id}`,
      title: `${person.name} verjaardag`,
      event_type: 'birthday',
      event_date: getNextYearlyOccurrence(person.birthdate),
      recurrence_type: 'yearly',
      reminder_days: [],
      notes: person.notes || null,
      area_id: null,
      status: 'active',
      created_at: null,
      updated_at: null,
      areas: null,
      life_event_people: [{ person_id: person.id }],
      derived_from: 'people.birthdate',
      source_person: {
        id: person.id,
        name: person.name,
        birthdate: person.birthdate,
      },
    }))
    .filter((event) => !!event.event_date)
}

function filterLifeEvents(events, filters) {
  return events.filter((event) => {
    if (filters.type && event.event_type !== filters.type) return false
    if (filters.status && event.status !== filters.status) return false
    if (filters.areaId && event.area_id !== filters.areaId) return false
    if (filters.from && event.event_date < filters.from) return false
    if (filters.to && event.event_date > filters.to) return false
    return true
  })
}

function withDb(app, db) {
  app.use('*', async (c, next) => {
    c.set('db', db)
    await next()
  })
}

function parseUuidList(value) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry)).filter(Boolean)
}

async function syncJoinTable(db, table, sourceColumn, sourceId, targetColumn, ids) {
  await db.from(table).delete().eq(sourceColumn, sourceId)
  if (!ids.length) return

  const rows = ids.map((id) => ({ [sourceColumn]: sourceId, [targetColumn]: id }))
  await db.from(table).insert(rows)
}

export function createApp({ db }) {
  const app = new Hono()
  withDb(app, db)

  app.get('/api/health', (c) => c.json({ status: 'ok' }))
  app.get('/api/openapi.json', (c) => c.json(openApiDocument))
  app.get('/api/docs', (c) => c.html(renderSwaggerUi(openApiDocument)))

  app.use('/api/*', async (c, next) => {
    const publicPaths = ['/api/health', '/api/openapi.json', '/api/docs']
    if (publicPaths.includes(c.req.path)) {
      await next()
      return
    }
    return apiAuth()(c, next)
  })

  app.get('/api/tasks', async (c) => {
    const db = c.get('db')
    let query = db
      .from('tasks')
      .select('*, areas(id, name), task_people(person_id)')
      .order('scheduled_date', { ascending: true })
      .order('created_at', { ascending: false })

    const assignedTo = c.req.query('assigned_to')
    const areaId = c.req.query('area_id')
    const scheduledDate = c.req.query('scheduled_date')

    if (assignedTo) query = query.eq('assigned_to', assignedTo)
    if (areaId) query = query.eq('area_id', areaId)
    if (scheduledDate) query = query.eq('scheduled_date', scheduledDate)

    const { data, error } = await query
    if (error) return jsonError(c, 500, 'Failed to load tasks', error.message)
    return c.json(data)
  })

  app.post('/api/tasks', async (c) => {
    const body = await c.req.json()
    if (!body.title || !body.scheduled_date) {
      return jsonError(c, 400, 'title and scheduled_date are required')
    }

    const db = c.get('db')
    const insertData = {
      title: String(body.title).trim(),
      description: body.description ? String(body.description).trim() : null,
      scheduled_date: body.scheduled_date,
      recurrence: body.recurrence ?? null,
      assigned_to: body.assigned_to ?? null,
      is_both: Boolean(body.is_both),
      created_by: body.created_by ?? null,
      area_id: body.area_id ?? null,
    }

    const { data, error } = await db.from('tasks').insert(insertData).select().single()
    if (error) return jsonError(c, 500, 'Failed to create task', error.message)

    await syncJoinTable(db, 'task_people', 'task_id', data.id, 'person_id', parseUuidList(body.person_ids))
    return c.json(data, 201)
  })

  app.patch('/api/tasks/:id', async (c) => {
    const body = await c.req.json()
    const db = c.get('db')
    const updates = pickDefined(body, ['title', 'description', 'scheduled_date', 'recurrence', 'assigned_to', 'is_both', 'created_by', 'area_id'])
    if (Object.keys(updates).length === 0 && !Object.prototype.hasOwnProperty.call(body, 'person_ids')) {
      return jsonError(c, 400, 'No task changes provided')
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await db.from('tasks').update(updates).eq('id', c.req.param('id'))
      if (error) return jsonError(c, 500, 'Failed to update task', error.message)
    }

    if (Object.prototype.hasOwnProperty.call(body, 'person_ids')) {
      await syncJoinTable(db, 'task_people', 'task_id', c.req.param('id'), 'person_id', parseUuidList(body.person_ids))
    }

    const { data, error } = await db.from('tasks').select('*').eq('id', c.req.param('id')).single()
    if (error) return jsonError(c, 500, 'Failed to reload task', error.message)
    return c.json(data)
  })

  app.delete('/api/tasks/:id', async (c) => {
    const db = c.get('db')
    const { error } = await db.from('tasks').delete().eq('id', c.req.param('id'))
    if (error) return jsonError(c, 500, 'Failed to delete task', error.message)
    return c.body(null, 204)
  })

  app.get('/api/people', async (c) => {
    const db = c.get('db')
    let query = db.from('people').select('*, linked_user:users(id, name)').order('name')
    const tag = c.req.query('tag')
    if (tag) query = query.contains('tags', [tag])
    const { data, error } = await query
    if (error) return jsonError(c, 500, 'Failed to load people', error.message)
    return c.json(data)
  })

  app.post('/api/people', async (c) => {
    const body = await c.req.json()
    if (!body.name) return jsonError(c, 400, 'name is required')
    const db = c.get('db')
    const { data, error } = await db
      .from('people')
      .insert({
        name: String(body.name).trim(),
        relationship: body.relationship ?? null,
        birthdate: body.birthdate ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        contact_information: body.contact_information ?? null,
        tags: normalizeTags(body.tags),
        linked_user_id: body.linked_user_id ?? null,
      })
      .select()
      .single()
    if (error) return jsonError(c, 500, 'Failed to create person', error.message)
    return c.json(data, 201)
  })

  app.patch('/api/people/:id', async (c) => {
    const body = await c.req.json()
    const db = c.get('db')
    const updates = pickDefined(body, ['name', 'relationship', 'birthdate', 'address', 'notes', 'email', 'phone', 'contact_information', 'linked_user_id'])
    if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
      updates.tags = normalizeTags(body.tags)
    }
    if (Object.keys(updates).length === 0) return jsonError(c, 400, 'No person changes provided')
    const { data, error } = await db.from('people').update(updates).eq('id', c.req.param('id')).select().single()
    if (error) return jsonError(c, 500, 'Failed to update person', error.message)
    return c.json(data)
  })

  app.get('/api/areas', async (c) => {
    const { data, error } = await c.get('db').from('areas').select('*').order('name')
    if (error) return jsonError(c, 500, 'Failed to load areas', error.message)
    return c.json(data)
  })

  app.post('/api/areas', async (c) => {
    const body = await c.req.json()
    if (!body.name) return jsonError(c, 400, 'name is required')
    const { data, error } = await c.get('db')
      .from('areas')
      .insert({ name: String(body.name).trim(), description: body.description ?? null })
      .select()
      .single()
    if (error) return jsonError(c, 500, 'Failed to create area', error.message)
    return c.json(data, 201)
  })

  app.get('/api/life-events', async (c) => {
    const db = c.get('db')
    let query = db
      .from('life_events')
      .select('*, areas(id, name), life_event_people(person_id)')
      .order('event_date', { ascending: true })

    const type = c.req.query('type')
    const status = c.req.query('status')
    const areaId = c.req.query('area_id')
    const from = c.req.query('from')
    const to = c.req.query('to')

    if (type) query = query.eq('event_type', type)
    if (status) query = query.eq('status', status)
    if (areaId) query = query.eq('area_id', areaId)
    if (from) query = query.gte('event_date', from)
    if (to) query = query.lte('event_date', to)

    const [{ data, error }, { data: peopleRows, error: peopleError }] = await Promise.all([
      query,
      db.from('people').select('id, name, birthdate, notes').not('birthdate', 'is', null),
    ])

    if (error) return jsonError(c, 500, 'Failed to load life events', error.message)
    if (peopleError) return jsonError(c, 500, 'Failed to load derived birthdays', peopleError.message)

    const realEvents = (data || []).filter((event) => event.event_type !== 'birthday')
    const derivedBirthdays = deriveBirthdayEvents(peopleRows || [])
    const filters = { type, status, areaId, from, to }
    const merged = filterLifeEvents([...realEvents, ...derivedBirthdays], filters)
      .sort((left, right) => left.event_date.localeCompare(right.event_date))

    return c.json(merged)
  })

  app.post('/api/life-events', async (c) => {
    const body = await c.req.json()
    if (!body.title || !body.event_date) {
      return jsonError(c, 400, 'title and event_date are required')
    }

    const db = c.get('db')
    const { data, error } = await db
      .from('life_events')
      .insert({
        title: String(body.title).trim(),
        event_type: body.event_type ?? 'general',
        event_date: body.event_date,
        recurrence_type: body.recurrence_type ?? 'none',
        custom_recurrence: body.custom_recurrence ?? null,
        reminder_days: normalizeIntegerArray(body.reminder_days),
        notes: body.notes ?? null,
        area_id: body.area_id ?? null,
        status: body.status ?? 'active',
      })
      .select()
      .single()
    if (error) return jsonError(c, 500, 'Failed to create life event', error.message)

    await syncJoinTable(db, 'life_event_people', 'life_event_id', data.id, 'person_id', parseUuidList(body.person_ids))
    return c.json(data, 201)
  })

  app.patch('/api/life-events/:id', async (c) => {
    const body = await c.req.json()
    const db = c.get('db')
    const updates = pickDefined(body, ['title', 'event_type', 'event_date', 'custom_recurrence', 'notes', 'area_id', 'status', 'recurrence_type'])
    if (Object.prototype.hasOwnProperty.call(body, 'reminder_days')) {
      updates.reminder_days = normalizeIntegerArray(body.reminder_days)
    }
    if (Object.keys(updates).length === 0 && !Object.prototype.hasOwnProperty.call(body, 'person_ids')) {
      return jsonError(c, 400, 'No life event changes provided')
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await db.from('life_events').update(updates).eq('id', c.req.param('id'))
      if (error) return jsonError(c, 500, 'Failed to update life event', error.message)
    }

    if (Object.prototype.hasOwnProperty.call(body, 'person_ids')) {
      await syncJoinTable(db, 'life_event_people', 'life_event_id', c.req.param('id'), 'person_id', parseUuidList(body.person_ids))
    }

    const { data, error } = await db.from('life_events').select('*').eq('id', c.req.param('id')).single()
    if (error) return jsonError(c, 500, 'Failed to reload life event', error.message)
    return c.json(data)
  })

  app.get('/api/knowledge', async (c) => {
    const db = c.get('db')
    let query = db.from('knowledge_entries').select('*, areas(id, name), people(id, name)').order('created_at', { ascending: false })
    const category = c.req.query('category')
    const areaId = c.req.query('area_id')
    const personId = c.req.query('person_id')
    const tag = c.req.query('tag')
    if (category) query = query.eq('category', category)
    if (areaId) query = query.eq('area_id', areaId)
    if (personId) query = query.eq('person_id', personId)
    if (tag) query = query.contains('tags', [tag])
    const { data, error } = await query
    if (error) return jsonError(c, 500, 'Failed to load knowledge entries', error.message)
    return c.json(data)
  })

  app.post('/api/knowledge', async (c) => {
    const body = await c.req.json()
    if (!body.title || !body.content) {
      return jsonError(c, 400, 'title and content are required')
    }

    const { data, error } = await c.get('db')
      .from('knowledge_entries')
      .insert({
        title: String(body.title).trim(),
        content: String(body.content).trim(),
        category: body.category ?? 'general',
        tags: normalizeTags(body.tags),
        area_id: body.area_id ?? null,
        person_id: body.person_id ?? null,
      })
      .select()
      .single()
    if (error) return jsonError(c, 500, 'Failed to create knowledge entry', error.message)
    return c.json(data, 201)
  })

  app.notFound((c) => jsonError(c, 404, 'Not found'))
  app.onError((error, c) => jsonError(c, 500, 'Internal server error', error.message))

  return app
}
