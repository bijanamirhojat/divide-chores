# Calendar Sync Foundation

## Goal

Divide can sync external calendar events into Supabase and expose them through the existing API.

Current MVP:

- direct CalDAV calendar URL
- iCloud-compatible setup
- read-only sync
- visible in the existing week/day UI as read-only agenda items
- public `webcal://` iCloud feed URLs also work

## New tables

- `calendar_sources`
- `calendar_events`

## Sync command

```bash
npm run calendar:sync
```

Optional filters:

```bash
npm run calendar:sync -- --provider icloud
npm run calendar:sync -- --source-id <uuid>
```

## Environment variables

Base API env:

```bash
VITE_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=8787
```

Example calendar secret pattern:

```bash
CALDAV_ESTHER_SHARED_PASSWORD=
```

The DB stores `secret_name`, not the password itself.

## Source configuration

Example `calendar_sources` row:

- `provider=icloud`
- `display_name=Esther gedeelde agenda`
- `sync_enabled=true`
- `sync_url=https://caldav.icloud.com/...`
- `username=<apple-id>`
- `secret_name=CALDAV_ESTHER_SHARED_PASSWORD`

Public iCloud/shared feed alternative:

- `sync_url=webcal://...`
- `username` optional
- `secret_name` optional

For a public/shared `webcal://` feed, the sync can run without a password.

## API endpoints

- `GET /api/calendar/sources`
- `GET /api/calendar/events`
- `GET /api/calendar/upcoming`
- `GET /api/calendar/today`
- `POST /api/calendar/sync`
- `GET /api/briefing/today`

## Briefing payload

`GET /api/briefing/today` returns structured JSON containing:

- today's calendar items
- upcoming calendar items within 7 days
- overdue tasks
- open tasks
- upcoming life events

## Known limitations

- no write-back to iCloud or other providers
- no discovery flow for iCloud accounts
- recurrence is synced as concrete occurrences within the sync window
- calendar items are visible in the UI but are not editable or completable as tasks
