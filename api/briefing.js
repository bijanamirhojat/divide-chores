import { addDays, startOfDay, toDateString } from './calendar/utils.js'

function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function matchesTaskRecurrence(task, dateStr) {
  const taskDate = new Date(`${task.scheduled_date}T12:00:00`)
  const viewDate = new Date(`${dateStr}T12:00:00`)

  if (task.recurrence === 'weekly') {
    return taskDate.getDay() === viewDate.getDay()
  }
  if (task.recurrence === 'biweekly') {
    if (taskDate.getDay() !== viewDate.getDay()) return false
    const diffTime = viewDate.getTime() - taskDate.getTime()
    const diffWeeks = Math.round(diffTime / (7 * 24 * 60 * 60 * 1000))
    return diffWeeks >= 0 && diffWeeks % 2 === 0
  }
  if (task.recurrence === 'monthly') {
    return taskDate.getDate() === viewDate.getDate()
  }
  return false
}

function buildTaskOccurrences(tasks, completedTasks, startDate, endDate) {
  const completedKey = new Set(
    (completedTasks || []).map((item) => `${item.task_id}:${item.week_number}:${item.year}`)
  )
  const items = []

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const dateStr = toDateString(cursor)
    const weekNumber = getWeekNumber(cursor)
    const year = cursor.getFullYear()

    for (const task of tasks || []) {
      const matches = task.recurrence
        ? matchesTaskRecurrence(task, dateStr)
        : task.scheduled_date === dateStr

      if (!matches) continue

      const key = `${task.id}:${weekNumber}:${year}`
      items.push({
        ...task,
        occurrence_date: dateStr,
        week_number: weekNumber,
        year,
        is_completed: completedKey.has(key),
      })
    }
  }

  return items
}

export async function buildTodayBriefing(db) {
  const today = startOfDay(new Date())
  const todayStr = toDateString(today)
  const upcomingLimitDate = addDays(today, 7)
  const upcomingDateStr = toDateString(upcomingLimitDate)

  const [calendarEventsResult, tasksResult, completedTasksResult, lifeEventsResult] = await Promise.all([
    db
      .from('calendar_events')
      .select('*')
      .eq('is_deleted', false)
      .order('start_at', { ascending: true })
      .order('start_date', { ascending: true }),
    db.from('tasks').select('*, areas(id, name), task_people(person_id)').order('scheduled_date', { ascending: true }),
    db.from('completed_tasks').select('*'),
    db
      .from('life_events')
      .select('*, areas(id, name), life_event_people(person_id)')
      .gte('event_date', todayStr)
      .lte('event_date', upcomingDateStr)
      .order('event_date', { ascending: true }),
  ])

  if (calendarEventsResult.error) throw calendarEventsResult.error
  if (tasksResult.error) throw tasksResult.error
  if (completedTasksResult.error) throw completedTasksResult.error
  if (lifeEventsResult.error) throw lifeEventsResult.error

  const taskOccurrences = buildTaskOccurrences(tasksResult.data || [], completedTasksResult.data || [], today, upcomingLimitDate)
  const overdueTasks = taskOccurrences.filter((task) => task.occurrence_date < todayStr && !task.is_completed)
  const openTasks = taskOccurrences.filter((task) => !task.is_completed)

  const allCalendarEvents = calendarEventsResult.data || []
  const todayEvents = allCalendarEvents.filter((event) => {
    if (event.all_day) {
      const endDate = event.end_date || event.start_date
      return event.start_date <= todayStr && todayStr <= endDate
    }
    return toDateString(event.start_at) === todayStr
  })

  const upcomingEvents = allCalendarEvents.filter((event) => {
    const eventDate = event.all_day ? event.start_date : toDateString(event.start_at)
    return !!eventDate && eventDate >= todayStr && eventDate <= upcomingDateStr
  })

  return {
    date: todayStr,
    calendar: {
      today: todayEvents,
      upcoming: upcomingEvents,
    },
    tasks: {
      overdue: overdueTasks,
      open: openTasks,
    },
    life_events: {
      upcoming: lifeEventsResult.data || [],
    },
  }
}
