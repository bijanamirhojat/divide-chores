# Pi API Deploy

This repo uses multi-deploy:

- Frontend: GitHub Pages
- API: Docker container on the Pi

## Files

- `Dockerfile.api`
- `deploy/pi/compose.yml`
- `deploy/pi/api.env.example`

## 1. Prepare the Pi

Clone or update this repo on the Pi.

Create the API env file next to the compose file:

```bash
cp deploy/pi/api.env.example deploy/pi/api.env
```

Fill in:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
PORT=8787
```

## 2. Start the API container

From the repo root on the Pi:

```bash
docker compose -f deploy/pi/compose.yml up -d --build
```

The container binds to `127.0.0.1:8787`, so the API is only reachable locally on the Pi.

## 3. Verify the API

Health check:

```bash
curl http://127.0.0.1:8787/api/health
```

Expected response:

```json
{"status":"ok"}
```

Authenticated request:

```bash
curl http://127.0.0.1:8787/api/people \
  -H "Authorization: Bearer <api-token>"
```

## 4. Hermes configuration

Hermes should use:

```bash
LIFE_OS_API_BASE_URL=http://127.0.0.1:8787
LIFE_OS_API_TOKEN=<api-token>
```

Hermes should not use `SUPABASE_SERVICE_ROLE_KEY`.

Use the API as the integration surface for:

- tasks
- people
- life events
- areas
- knowledge

Important domain rule:

- birthdays are derived from `people.birthdate` through `GET /api/life-events`

> **Note:** the calendar sync no longer runs on the Pi. It runs as a scheduled
> GitHub Actions workflow (`.github/workflows/calendar-sync.yml`), independent of
> this (on-hold) Life OS API. See that workflow for details.

## 5. Update the container later

From the repo root on the Pi:

```bash
git pull
docker compose -f deploy/pi/compose.yml up -d --build
```
