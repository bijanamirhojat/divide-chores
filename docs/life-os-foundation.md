# Life OS Foundation

## Current direction

The existing React/Supabase todo app remains intact.

Phase 1 adds a small in-repo API layer plus new database structures that can support:

- People
- Life events
- Areas
- Personal knowledge
- External integrations

## API

The API lives under `api/` and runs separately from the Vite frontend.

### Environment variables

```bash
VITE_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PORT=8787
```

Notes:

- The frontend keeps using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`.
- The API now reuses `VITE_SUPABASE_URL` if `SUPABASE_URL` is not set.
- The API requires `SUPABASE_SERVICE_ROLE_KEY` for server-to-Supabase access.

### Run locally

```bash
npm run api:dev
```

### Create an API token

```bash
npm run api:token -- --label anne-local
```

This stores only the token hash in `public.api_tokens` and prints the raw token once.

### Auth

All `/api/*` routes except health and docs require:

```bash
Authorization: Bearer <api-token>
```

Tokens are stored hashed in `public.api_tokens`.

## New schema

Migration file:

- `supabase/migrations/20260530_life_os_foundation.sql`

### Added tables

- `areas`
- `people`
- `life_events`
- `life_event_people`
- `knowledge_entries`
- `api_tokens`
- `task_people`

### Existing table changes

- `tasks.area_id`
- `people.address`

## OpenAPI

- JSON: `/api/openapi.json`
- Swagger UI: `/api/docs`

## Deploy targets

- Frontend: GitHub Pages
- API: Docker container on the Pi

Tracked files for Pi deploy:

- `Dockerfile.api`
- `deploy/pi/compose.yml`
- `deploy/pi/api.env.example`
- `docs/pi-deploy.md`

## Notes

- Existing todo functionality is not replaced.
- Existing browser-to-Supabase flows stay in place.
- The new API is the forward-looking integration surface for ANNE and other systems.
- Birthdays are derived from `people.birthdate` in the moment feed instead of being managed twice.
