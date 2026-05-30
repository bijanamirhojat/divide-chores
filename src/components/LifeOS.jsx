import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AnimatedOverlay from './AnimatedOverlay'

const TABS = [
  { key: 'areas', label: 'Domeinen' },
  { key: 'people', label: 'Mensen' },
  { key: 'events', label: 'Momenten' },
  { key: 'knowledge', label: 'Kennis' },
]

export default function LifeOS({ show, onClose, currentUser, users }) {
  const [activeTab, setActiveTab] = useState('areas')
  const [showComposer, setShowComposer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [areas, setAreas] = useState([])
  const [people, setPeople] = useState([])
  const [lifeEvents, setLifeEvents] = useState([])
  const [knowledgeEntries, setKnowledgeEntries] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [editingItem, setEditingItem] = useState(null)

  const [areaForm, setAreaForm] = useState({ name: '', description: '' })
  const [personForm, setPersonForm] = useState({ name: '', relationship: '', birthdate: '', address: '', notes: '', email: '', phone: '', tags: '' })
  const [eventForm, setEventForm] = useState({ title: '', event_type: 'general', event_date: '', recurrence_type: 'none', reminder_days: '', notes: '', area_id: '', person_id: '', status: 'active' })
  const [knowledgeForm, setKnowledgeForm] = useState({ title: '', content: '', category: 'general', tags: '', area_id: '', person_id: '' })

  useEffect(() => {
    if (show) {
      loadData()
    }
  }, [show])

  useEffect(() => {
    setShowComposer(false)
    setEditingItem(null)
  }, [activeTab])

  function startEditingArea(area) {
    setEditingItem({ type: 'area', id: area.id })
    setAreaForm({ name: area.name || '', description: area.description || '' })
    setShowComposer(true)
  }

  function startEditingPerson(person) {
    setEditingItem({ type: 'person', id: person.id })
    setPersonForm({
      name: person.name || '',
      relationship: person.relationship || '',
      birthdate: person.birthdate || '',
      address: person.address || '',
      notes: person.notes || '',
      email: person.email || '',
      phone: person.phone || '',
      tags: person.tags?.join(', ') || '',
    })
    setShowComposer(true)
  }

  function startEditingEvent(event) {
    if (event.derived_from === 'people.birthdate') return
    setEditingItem({ type: 'event', id: event.id })
    setEventForm({
      title: event.title || '',
      event_type: event.event_type || 'general',
      event_date: event.event_date || '',
      recurrence_type: event.recurrence_type || 'none',
      reminder_days: event.reminder_days?.join(',') || '',
      notes: event.notes || '',
      area_id: event.area_id || '',
      person_id: event.life_event_people?.[0]?.person_id || '',
      status: event.status || 'active',
    })
    setShowComposer(true)
  }

  function startEditingKnowledge(entry) {
    setEditingItem({ type: 'knowledge', id: entry.id })
    setKnowledgeForm({
      title: entry.title || '',
      content: entry.content || '',
      category: entry.category || 'general',
      tags: entry.tags?.join(', ') || '',
      area_id: entry.area_id || '',
      person_id: entry.person_id || '',
    })
    setShowComposer(true)
  }

  function resetComposer() {
    setEditingItem(null)
    setShowComposer(false)
    setAreaForm({ name: '', description: '' })
    setPersonForm({ name: '', relationship: '', birthdate: '', address: '', notes: '', email: '', phone: '', tags: '' })
    setEventForm({ title: '', event_type: 'general', event_date: '', recurrence_type: 'none', reminder_days: '', notes: '', area_id: '', person_id: '', status: 'active' })
    setKnowledgeForm({ title: '', content: '', category: 'general', tags: '', area_id: '', person_id: '' })
  }

  async function loadData() {
    setLoading(true)
    setErrorMessage('')

    const [areasResult, peopleResult, eventsResult, knowledgeResult] = await Promise.all([
      supabase.from('areas').select('*').order('name'),
      supabase.from('people').select('*, linked_user:users(id, name)').order('name'),
      supabase.from('life_events').select('*, areas(id, name), life_event_people(person_id)').order('event_date', { ascending: true }),
      supabase.from('knowledge_entries').select('*, areas(id, name), people(id, name)').order('created_at', { ascending: false }),
    ])

    if (areasResult.error || peopleResult.error || eventsResult.error || knowledgeResult.error) {
      setErrorMessage('Kon Life OS data niet laden')
    }

    const nextAreas = areasResult.data || []
    const nextPeople = peopleResult.data || []
    const nextEvents = eventsResult.data || []

    setAreas(nextAreas)
    setPeople(nextPeople)
    setLifeEvents(mergeDerivedBirthdays(nextEvents, nextPeople))
    setKnowledgeEntries(knowledgeResult.data || [])
    setLoading(false)
  }

  function mergeDerivedBirthdays(events, peopleRows) {
    const realEvents = events.filter((event) => event.event_type !== 'birthday')
    const derivedBirthdays = peopleRows
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
        areas: null,
        life_event_people: [{ person_id: person.id }],
        derived_from: 'people.birthdate',
      }))
      .filter((event) => !!event.event_date)

    return [...realEvents, ...derivedBirthdays].sort((left, right) => left.event_date.localeCompare(right.event_date))
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
    return occurrence.toISOString().slice(0, 10)
  }

  function splitTags(value) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  function splitReminderDays(value) {
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item))
  }

  async function handleCreateArea(e) {
    e.preventDefault()
    if (!areaForm.name.trim()) return

    const query = editingItem?.type === 'area'
      ? supabase.from('areas').update({
          name: areaForm.name.trim(),
          description: areaForm.description.trim() || null,
        }).eq('id', editingItem.id)
      : supabase.from('areas').insert({
          name: areaForm.name.trim(),
          description: areaForm.description.trim() || null,
        })

    const { error } = await query

    if (error) {
      setErrorMessage('Area opslaan is niet gelukt')
      return
    }

    resetComposer()
    loadData()
  }

  async function handleCreatePerson(e) {
    e.preventDefault()
    if (!personForm.name.trim()) return

    const linkedUser = users.find((user) => user.name.toLowerCase() === personForm.name.trim().toLowerCase())
    const payload = {
      name: personForm.name.trim(),
      relationship: personForm.relationship.trim() || null,
      birthdate: personForm.birthdate || null,
      address: personForm.address.trim() || null,
      notes: personForm.notes.trim() || null,
      email: personForm.email.trim() || null,
      phone: personForm.phone.trim() || null,
      tags: splitTags(personForm.tags),
      linked_user_id: linkedUser?.id || null,
    }

    const query = editingItem?.type === 'person'
      ? supabase.from('people').update(payload).eq('id', editingItem.id)
      : supabase.from('people').insert(payload)

    const { error } = await query

    if (error) {
      setErrorMessage('Persoon opslaan is niet gelukt')
      return
    }

    resetComposer()
    loadData()
  }

  async function handleCreateLifeEvent(e) {
    e.preventDefault()
    if (!eventForm.title.trim() || !eventForm.event_date) return

    const payload = {
      title: eventForm.title.trim(),
      event_type: eventForm.event_type,
      event_date: eventForm.event_date,
      recurrence_type: eventForm.recurrence_type,
      reminder_days: splitReminderDays(eventForm.reminder_days),
      notes: eventForm.notes.trim() || null,
      area_id: eventForm.area_id || null,
      status: eventForm.status,
    }

    const query = editingItem?.type === 'event'
      ? supabase.from('life_events').update(payload).eq('id', editingItem.id).select().single()
      : supabase.from('life_events').insert(payload).select().single()

    const { data, error } = await query

    if (error || !data) {
      setErrorMessage('Life event opslaan is niet gelukt')
      return
    }

    if (editingItem?.type === 'event') {
      await supabase.from('life_event_people').delete().eq('life_event_id', editingItem.id)
    }

    if (eventForm.person_id) {
      await supabase.from('life_event_people').insert({
        life_event_id: data.id,
        person_id: eventForm.person_id,
      })
    }

    resetComposer()
    loadData()
  }

  async function handleCreateKnowledge(e) {
    e.preventDefault()
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return

    const payload = {
      title: knowledgeForm.title.trim(),
      content: knowledgeForm.content.trim(),
      category: knowledgeForm.category.trim() || 'general',
      tags: splitTags(knowledgeForm.tags),
      area_id: knowledgeForm.area_id || null,
      person_id: knowledgeForm.person_id || null,
    }

    const query = editingItem?.type === 'knowledge'
      ? supabase.from('knowledge_entries').update(payload).eq('id', editingItem.id)
      : supabase.from('knowledge_entries').insert(payload)

    const { error } = await query

    if (error) {
      setErrorMessage('Knowledge opslaan is niet gelukt')
      return
    }

    resetComposer()
    loadData()
  }

  async function handleDelete(type, id) {
    if (type === 'event' && String(id).startsWith('person-birthday-')) {
      setErrorMessage('Verjaardagen beheer je via de persoon')
      return
    }

    const confirmed = confirm('Weet je zeker dat je dit item wilt verwijderen?')
    if (!confirmed) return

    let error = null
    if (type === 'area') {
      ;({ error } = await supabase.from('areas').delete().eq('id', id))
    } else if (type === 'person') {
      ;({ error } = await supabase.from('people').delete().eq('id', id))
    } else if (type === 'event') {
      await supabase.from('life_event_people').delete().eq('life_event_id', id)
      ;({ error } = await supabase.from('life_events').delete().eq('id', id))
    } else if (type === 'knowledge') {
      ;({ error } = await supabase.from('knowledge_entries').delete().eq('id', id))
    }

    if (error) {
      setErrorMessage('Verwijderen is niet gelukt')
      return
    }

    if (editingItem?.id === id && editingItem?.type === type) {
      resetComposer()
    }
    loadData()
  }

  function findPersonName(personId) {
    return people.find((person) => person.id === personId)?.name || 'Onbekend'
  }

  function formatEventType(type) {
    const labels = {
      general: 'Algemeen',
      birthday: 'Verjaardag',
      renewal: 'Verlenging',
      appointment: 'Afspraak',
      maintenance: 'Onderhoud',
      vacation: 'Vakantie',
    }
    return labels[type] || type
  }

  function formatRecurrence(type) {
    const labels = {
      none: 'Eenmalig',
      yearly: 'Jaarlijks',
      monthly: 'Maandelijks',
      custom: 'Aangepast',
    }
    return labels[type] || type
  }

  function currentTabActionLabel() {
    if (activeTab === 'areas') return 'Nieuw domein'
    if (activeTab === 'people') return 'Nieuw persoon'
    if (activeTab === 'events') return 'Nieuwe gebeurtenis'
    return 'Nieuw kennisitem'
  }

  return (
    <AnimatedOverlay show={show} onClose={onClose} direction="up" className="w-full h-full">
      <div className="bg-white w-full h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Life OS</h2>
            <p className="text-sm text-gray-400 mt-0.5">Basis voor mensen, gebeurtenissen en kennis</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 pb-24 space-y-5">
          <div className="bg-gradient-to-br from-pastel-mint/35 to-pastel-lavender/35 rounded-[1.75rem] p-4 shadow-sm">
            <p className="text-sm text-gray-500">Ingelogd als</p>
            <p className="text-lg font-semibold text-gray-800 mt-0.5">{currentUser?.name}</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-white/80 rounded-2xl px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Domeinen</p>
                <p className="text-lg font-semibold text-gray-800 mt-0.5">{areas.length}</p>
              </div>
              <div className="bg-white/80 rounded-2xl px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Mensen</p>
                <p className="text-lg font-semibold text-gray-800 mt-0.5">{people.length}</p>
              </div>
              <div className="bg-white/80 rounded-2xl px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Momenten</p>
                <p className="text-lg font-semibold text-gray-800 mt-0.5">{lifeEvents.length}</p>
              </div>
              <div className="bg-white/80 rounded-2xl px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Kennis</p>
                <p className="text-lg font-semibold text-gray-800 mt-0.5">{knowledgeEntries.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-100 p-2 rounded-2xl">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full py-2.5 px-3 rounded-xl text-sm font-medium text-center transition-all ${
                  activeTab === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-red-50 text-red-500 text-sm px-4 py-3">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{currentTabActionLabel()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Snel toevoegen zonder de rest van de app te verlaten</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComposer((prev) => !prev)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                    showComposer ? 'bg-gray-200 text-gray-700' : 'bg-accent-mint text-white shadow-soft'
                  }`}
                >
                  {showComposer ? 'Sluiten' : 'Toevoegen'}
                </button>
              </div>

              {activeTab === 'areas' && (
                <>
                  {showComposer && (
                    <form onSubmit={handleCreateArea} className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-gray-100 space-y-4">
                      <h3 className="font-semibold text-gray-800">{editingItem?.type === 'area' ? 'Domein wijzigen' : 'Nieuw domein'}</h3>
                      <input value={areaForm.name} onChange={(e) => setAreaForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Bijv. Huis, Financien, Gezondheid" className="input-field" required />
                      <textarea value={areaForm.description} onChange={(e) => setAreaForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Korte context..." className="input-field resize-none" rows={2} />
                      <button type="submit" className="btn-primary w-full py-3">{editingItem?.type === 'area' ? 'Wijzigingen opslaan' : 'Domein toevoegen'}</button>
                      {editingItem?.type === 'area' && <button type="button" onClick={resetComposer} className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Annuleren</button>}
                    </form>
                  )}

                  <div className="space-y-3">
                    {areas.map((area) => (
                      <div key={area.id} className="p-4 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-700">{area.name}</p>
                            <span className="inline-flex mt-2 text-[11px] px-2 py-1 rounded-lg bg-pastel-peach/30 text-pastel-peachDark">Domein</span>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEditingArea(area)} className="text-xs text-gray-400 hover:text-gray-600">Wijzigen</button>
                            <button type="button" onClick={() => handleDelete('area', area.id)} className="text-xs text-red-400 hover:text-red-500">Verwijderen</button>
                          </div>
                        </div>
                        {area.description && <p className="text-sm text-gray-400 mt-2 leading-relaxed">{area.description}</p>}
                      </div>
                    ))}
                    {areas.length === 0 && <EmptyState text="Nog geen domeinen toegevoegd" />}
                  </div>
                </>
              )}

              {activeTab === 'people' && (
                <>
                  {showComposer && (
                    <form onSubmit={handleCreatePerson} className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-gray-100 space-y-4">
                      <h3 className="font-semibold text-gray-800">{editingItem?.type === 'person' ? 'Persoon wijzigen' : 'Nieuw persoon'}</h3>
                      <input value={personForm.name} onChange={(e) => setPersonForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Naam" className="input-field" required />
                      <input value={personForm.relationship} onChange={(e) => setPersonForm((prev) => ({ ...prev, relationship: e.target.value }))} placeholder="Relatie, bijv. partner of familie" className="input-field" />
                      <input type="date" value={personForm.birthdate} onChange={(e) => setPersonForm((prev) => ({ ...prev, birthdate: e.target.value }))} className="input-field" />
                      <textarea value={personForm.address} onChange={(e) => setPersonForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Adres" className="input-field resize-none" rows={2} />
                      <input value={personForm.email} onChange={(e) => setPersonForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="E-mail" className="input-field" />
                      <input value={personForm.phone} onChange={(e) => setPersonForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Telefoon" className="input-field" />
                      <input value={personForm.tags} onChange={(e) => setPersonForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags, komma gescheiden" className="input-field" />
                      <textarea value={personForm.notes} onChange={(e) => setPersonForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notities" className="input-field resize-none" rows={2} />
                      <button type="submit" className="btn-primary w-full py-3">{editingItem?.type === 'person' ? 'Wijzigingen opslaan' : 'Persoon toevoegen'}</button>
                      {editingItem?.type === 'person' && <button type="button" onClick={resetComposer} className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Annuleren</button>}
                    </form>
                  )}

                  <div className="space-y-3">
                    {people.map((person) => (
                      <div key={person.id} className="p-4 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-700">{person.name}</p>
                            {person.relationship && <span className="inline-flex mt-2 text-xs px-2 py-1 rounded-lg bg-pastel-lavender/30 text-pastel-lavenderDark">{person.relationship}</span>}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEditingPerson(person)} className="text-xs text-gray-400 hover:text-gray-600">Wijzigen</button>
                            <button type="button" onClick={() => handleDelete('person', person.id)} className="text-xs text-red-400 hover:text-red-500">Verwijderen</button>
                          </div>
                        </div>
                        {person.birthdate && <p className="text-sm text-gray-400 mt-1">Geboren: {new Date(person.birthdate + 'T12:00:00').toLocaleDateString('nl-NL')}</p>}
                        {person.address && <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">{person.address}</p>}
                        {(person.email || person.phone) && <p className="text-sm text-gray-400 mt-1">{person.email || person.phone}</p>}
                        {person.tags?.length > 0 && <p className="text-xs text-gray-400 mt-2">{person.tags.join(' • ')}</p>}
                        {person.notes && <p className="text-sm text-gray-500 mt-2">{person.notes}</p>}
                      </div>
                    ))}
                    {people.length === 0 && <EmptyState text="Nog geen mensen toegevoegd" />}
                  </div>
                </>
              )}

              {activeTab === 'events' && (
                <>
                  {showComposer && (
                    <form onSubmit={handleCreateLifeEvent} className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-gray-100 space-y-4">
                      <h3 className="font-semibold text-gray-800">{editingItem?.type === 'event' ? 'Gebeurtenis wijzigen' : 'Nieuwe gebeurtenis'}</h3>
                      <input value={eventForm.title} onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Titel" className="input-field" required />
                      <div className="grid grid-cols-2 gap-3">
                        <select value={eventForm.event_type} onChange={(e) => setEventForm((prev) => ({ ...prev, event_type: e.target.value }))} className="input-field">
                          <option value="general">Algemeen</option>
                          <option value="renewal">Verlenging</option>
                          <option value="appointment">Afspraak</option>
                          <option value="maintenance">Onderhoud</option>
                          <option value="vacation">Vakantie</option>
                        </select>
                        <input type="date" value={eventForm.event_date} onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))} className="input-field" required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select value={eventForm.recurrence_type} onChange={(e) => setEventForm((prev) => ({ ...prev, recurrence_type: e.target.value }))} className="input-field">
                          <option value="none">Eenmalig</option>
                          <option value="yearly">Jaarlijks</option>
                          <option value="monthly">Maandelijks</option>
                          <option value="custom">Aangepast</option>
                        </select>
                        <select value={eventForm.status} onChange={(e) => setEventForm((prev) => ({ ...prev, status: e.target.value }))} className="input-field">
                          <option value="active">Actief</option>
                          <option value="completed">Afgerond</option>
                          <option value="cancelled">Geannuleerd</option>
                          <option value="archived">Gearchiveerd</option>
                        </select>
                      </div>
                      <input value={eventForm.reminder_days} onChange={(e) => setEventForm((prev) => ({ ...prev, reminder_days: e.target.value }))} placeholder="Reminder dagen, bijv. 30,7,1" className="input-field" />
                      <div className="grid grid-cols-2 gap-3">
                        <select value={eventForm.area_id} onChange={(e) => setEventForm((prev) => ({ ...prev, area_id: e.target.value }))} className="input-field">
                          <option value="">Geen domein</option>
                          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                        </select>
                        <select value={eventForm.person_id} onChange={(e) => setEventForm((prev) => ({ ...prev, person_id: e.target.value }))} className="input-field">
                          <option value="">Geen persoon</option>
                          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                        </select>
                      </div>
                      <textarea value={eventForm.notes} onChange={(e) => setEventForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notities" className="input-field resize-none" rows={2} />
                      <button type="submit" className="btn-primary w-full py-3">{editingItem?.type === 'event' ? 'Wijzigingen opslaan' : 'Gebeurtenis toevoegen'}</button>
                      {editingItem?.type === 'event' && <button type="button" onClick={resetComposer} className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Annuleren</button>}
                    </form>
                  )}

                  <div className="space-y-3">
                    {lifeEvents.map((event) => (
                      <div key={event.id} className="p-4 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-700">{event.title}</p>
                            <span className="inline-flex mt-2 text-xs px-2 py-1 rounded-lg bg-pastel-mint/30 text-accent-mint">{formatRecurrence(event.recurrence_type)}</span>
                          </div>
                          <div className="flex gap-2">
                            {event.derived_from === 'people.birthdate' ? (
                              <span className="text-xs text-gray-300">Via persoon</span>
                            ) : (
                              <>
                                <button type="button" onClick={() => startEditingEvent(event)} className="text-xs text-gray-400 hover:text-gray-600">Wijzigen</button>
                                <button type="button" onClick={() => handleDelete('event', event.id)} className="text-xs text-red-400 hover:text-red-500">Verwijderen</button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{new Date(event.event_date + 'T12:00:00').toLocaleDateString('nl-NL')}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
                          <span>{formatEventType(event.event_type)}</span>
                          {event.areas?.name && <span>• {event.areas.name}</span>}
                          {event.life_event_people?.[0]?.person_id && <span>• {findPersonName(event.life_event_people[0].person_id)}</span>}
                        </div>
                        {event.notes && <p className="text-sm text-gray-500 mt-2">{event.notes}</p>}
                      </div>
                    ))}
                    {lifeEvents.length === 0 && <EmptyState text="Nog geen momenten toegevoegd" />}
                  </div>
                </>
              )}

              {activeTab === 'knowledge' && (
                <>
                  {showComposer && (
                    <form onSubmit={handleCreateKnowledge} className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-gray-100 space-y-4">
                      <h3 className="font-semibold text-gray-800">{editingItem?.type === 'knowledge' ? 'Kennisitem wijzigen' : 'Nieuw kennisitem'}</h3>
                      <input value={knowledgeForm.title} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Titel" className="input-field" required />
                      <textarea value={knowledgeForm.content} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Inhoud" className="input-field resize-none" rows={4} required />
                      <input value={knowledgeForm.category} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Categorie" className="input-field" />
                      <input value={knowledgeForm.tags} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags, komma gescheiden" className="input-field" />
                      <div className="grid grid-cols-2 gap-3">
                        <select value={knowledgeForm.area_id} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, area_id: e.target.value }))} className="input-field">
                          <option value="">Geen domein</option>
                          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                        </select>
                        <select value={knowledgeForm.person_id} onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, person_id: e.target.value }))} className="input-field">
                          <option value="">Geen persoon</option>
                          {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                        </select>
                      </div>
                      <button type="submit" className="btn-primary w-full py-3">{editingItem?.type === 'knowledge' ? 'Wijzigingen opslaan' : 'Kennisitem toevoegen'}</button>
                      {editingItem?.type === 'knowledge' && <button type="button" onClick={resetComposer} className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Annuleren</button>}
                    </form>
                  )}

                  <div className="space-y-3">
                    {knowledgeEntries.map((entry) => (
                      <div key={entry.id} className="p-4 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-700">{entry.title}</p>
                            <span className="inline-flex mt-2 text-xs px-2 py-1 rounded-lg bg-pastel-peach/30 text-pastel-peachDark">{entry.category}</span>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEditingKnowledge(entry)} className="text-xs text-gray-400 hover:text-gray-600">Wijzigen</button>
                            <button type="button" onClick={() => handleDelete('knowledge', entry.id)} className="text-xs text-red-400 hover:text-red-500">Verwijderen</button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 whitespace-pre-wrap">{entry.content}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-400">
                          {entry.areas?.name && <span>{entry.areas.name}</span>}
                          {entry.people?.name && <span>• {entry.people.name}</span>}
                          {entry.tags?.length > 0 && <span>• {entry.tags.join(' • ')}</span>}
                        </div>
                      </div>
                    ))}
                    {knowledgeEntries.length === 0 && <EmptyState text="Nog geen kennisitems toegevoegd" />}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AnimatedOverlay>
  )
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-10 px-4 bg-gray-50 rounded-[1.5rem] border border-dashed border-gray-200">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}
