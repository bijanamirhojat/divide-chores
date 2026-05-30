export async function listInboundMail(db, filters = {}) {
  let query = db
    .from('inbound_mail')
    .select('*')
    .order('received_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.processed !== undefined) query = query.eq('processed', filters.processed)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.limit) query = query.limit(filters.limit)

  return query
}

export async function getInboundMailById(db, id) {
  return db.from('inbound_mail').select('*').eq('id', id).single()
}

export async function createInboundMail(db, payload) {
  return db.from('inbound_mail').insert(payload).select('*').single()
}

export async function updateInboundMail(db, id, updates) {
  return db.from('inbound_mail').update(updates).eq('id', id).select('*').single()
}
