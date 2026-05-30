# Divide/Chores 🏠

Een takenlijst app voor het huishouden van Bijan en Esther.

---

## Live URL

**https://bijanamirhojat.github.io/divide-chores/**

Presentatie modus: **https://bijanamirhojat.github.io/divide-chores/?mode=presentation**

---

## Technische Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL)
- **Auth**: PIN-based (gedeeld)
- **Hosting**: GitHub Pages
- **Integration API**: In-repo Hono service for Life OS foundation

---

## Life OS Foundation

Er is nu een eerste API-laag en migratiestructuur aanwezig voor toekomstige uitbreidingen:

- `api/` bevat de REST API
- `supabase/migrations/` bevat tracked SQL migraties
- `docs/life-os-foundation.md` beschrijft de nieuwe foundation

Belangrijke endpoints:

- `GET /api/health`
- `GET|POST|PATCH|DELETE /api/tasks`
- `GET|POST|PATCH /api/people`
- `GET|POST|PATCH /api/life-events`
- `GET /api/calendar/sources`
- `GET /api/calendar/events`
- `GET /api/calendar/upcoming`
- `GET /api/calendar/today`
- `POST /api/calendar/sync`
- `GET /api/briefing/today`
- `GET|POST /api/areas`
- `GET|POST /api/knowledge`
- `GET /api/openapi.json`
- `GET /api/docs`

Lokale API env:

- `VITE_SUPABASE_URL` kan uit de bestaande `.env` komen
- `SUPABASE_SERVICE_ROLE_KEY` moet aanwezig zijn voor de API
- kalender secrets blijven in env, bijvoorbeeld `CALDAV_ESTHER_SHARED_PASSWORD`

Deploy model:

- Frontend deployt naar GitHub Pages
- API draait als Docker container op de Pi
- Hermes gebruikt de lokale API op `http://127.0.0.1:8787`

Token genereren:

```bash
npm run api:token -- --label anne-local
```

Calendar sync handmatig draaien:

```bash
npm run calendar:sync
```

---

## Project Structuur

```
divide-chores/
├── src/
│   ├── components/
│   │   ├── Login.jsx       # PIN login + naam selectie
│   │   ├── WeekView.jsx    # Hoofdscherm met week/dag view
│   │   ├── TaskItem.jsx    # Individuele taak component
│   │   ├── TaskModal.jsx   # Modal om taken/eten toe te voegen
│   │   ├── Menu.jsx        # Menu met history
│   │   └── Confetti.jsx    # Animatie bij afronden taak
│   ├── lib/
│   │   └── supabase.js     # Supabase client
│   ├── App.jsx             # Hoofdcomponent
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind imports
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env                    # Supabase credentials (NIET committen)
```

---

## Database Schema (Supabase)

### `users` tabel
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID | Primary key |
| pin | TEXT | PIN code |
| name | TEXT | Naam (Bijan/Esther) |
| avatar_url | TEXT | Profielfoto URL (optioneel) |
| created_at | TIMESTAMP | Created at |

### `tasks` tabel
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID | Primary key |
| title | TEXT | Taak titel |
| description | TEXT | Optionele beschrijving |
| day_of_week | INTEGER | 0=ma, 6=zo |
| assigned_to | UUID | FK naar users.id |
| is_both | BOOLEAN | Samen doen |
| is_recurring | BOOLEAN | Wekelijks herhalen |
| created_by | UUID | FK naar users.id |
| created_at | TIMESTAMP | Created at |

### `completed_tasks` tabel
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID | Primary key |
| task_id | UUID | FK naar tasks.id |
| user_id | UUID | FK naar users.id |
| week_number | INTEGER | Weeknummer |
| year | INTEGER | Jaar |
| completed_at | TIMESTAMP | Wanneer voltooid |

### `meals` tabel
| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID | Primary key |
| day_of_week | INTEGER | 0=ma, 6=zo |
| meal_name | TEXT | Naam van het eten |
| meal_type | TEXT | 'lunch' of 'dinner' |
| week_number | INTEGER | Weeknummer |
| year | INTEGER | Jaar |
| created_at | TIMESTAMP | Created at |

---

## Hoe te Draaien

### Lokaal Ontwikkelen

```bash
cd divide-chores
npm install
npm run dev
```

Dit start de dev server op http://localhost:5173

**Let op**: Maak een `.env` bestand aan in de project root:
```
VITE_SUPABASE_URL=jouw_supabase_url
VITE_SUPABASE_ANON_KEY=jouw_anon_key
```

### Bouwen voor Productie

```bash
npm run build
```

Dit maakt een `dist` folder die naar GitHub Pages kan worden gedeployed.

### PWA Installeren

Op mobiel kun je de app installeren als native app:
- **iOS**: Open in Safari → Delen → "Zet op beginscherm"
- **Android**: Open in Chrome → Menu → "App installeren" of "Toevoegen aan beginscherm"

Het icoon gebruikt `app_icon.jpeg` uit de `public` folder.

---

## Deployen naar GitHub Pages

De repo heeft een GitHub Action workflow die automatisch bouwt bij elke push naar main.

**Belangrijk**: Voeg de volgende GitHub Secrets toe in repo Settings > Secrets and variables > Actions:
- `VITE_SUPABASE_URL` - Je Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Je Supabase anon key

## API op de Pi draaien

De Node API draait niet op GitHub Pages. Gebruik daarvoor Docker op de Pi.

Belangrijke files:

- `Dockerfile.api`
- `deploy/pi/compose.yml`
- `deploy/pi/api.env.example`
- `docs/pi-deploy.md`
- `docs/calendar-sync-foundation.md`

Kort stappenplan:

```bash
cp deploy/pi/api.env.example deploy/pi/api.env
docker compose -f deploy/pi/compose.yml up -d --build
curl http://127.0.0.1:8787/api/health
```

Hermes config:

```bash
LIFE_OS_API_BASE_URL=http://127.0.0.1:8787
LIFE_OS_API_TOKEN=<api-token>
```

Gebruik niet de `SUPABASE_SERVICE_ROLE_KEY` in Hermes.

## Calendar Sync Foundation

Divide kan nu externe agenda-events cachen en via de API ontsluiten.

MVP-opzet:

- directe CalDAV calendar URL
- iCloud-compatible met app-specific password
- publieke `webcal://` iCloud calendar feeds werken ook
- read-only sync
- agenda-items zichtbaar in de bestaande week/dag UI

Belangrijke tabellen:

- `calendar_sources`
- `calendar_events`

Belangrijke env/config pattern:

- bewaar het echte wachtwoord in env
- zet in `calendar_sources.secret_name` alleen de naam van die secret

Voorbeeld:

```bash
CALDAV_ESTHER_SHARED_PASSWORD=
```

Meer details staan in `docs/calendar-sync-foundation.md`.

---

## Gebruik van de App

1. Open de URL
2. Voer PIN in (zie Supabase database)
3. Selecteer je naam (Bijan of Esther)
4. Navigeer tussen dagen met de pijltjes bovenin
5. Tik op "+" om taak of eten toe te voegen
6. Tik op een taak om af te vinken (met confetti animatie)
7. Swipe naar links op een taak om te verwijderen
8. Gebruik het menu (hamburger linksboven) voor:
   - Voltooide taken history
   - Presentatie modus (week view op groot scherm)
   - Uitloggen

### Taak toevoegen
1. Klik op "+"
2. Kies "Taak" of "Eten" met de toggle bovenaan
3. Vul de details in
4. Optioneel: voeg tegelijk eten toe voor die dag

### Eten toevoegen
1. Klik op "+" → kies "Eten"
2. Of voeg het toe via de taak-modal

### Statistieken bekijken
1. Open het menu (hamburger linksboven)
2. Klik op "Statistieken"
3. Kies een periode: Week, Maand, Jaar, of Alle tijden
4. Bekijk statistieken per persoon en meest voltooide taken

---

## Features

- ✅ Taken zijn voor iedereen afgevinkt (één persoon hoeft maar af te vinken)
- ✅ Mobile-first design
- ✅ Numeriek toetsenbord voor PIN invoer
- ✅ Week view in presentatie modus
- ✅ Presentatie modus ook op mobiel (dag-carousel)
- ✅ Taken toewijzen aan Bijan, Esther, of samen
- ✅ Repeterende taken (wekelijks herhalen of éénmalig)
- ✅ Confetti animatie bij afronden taak
- ✅ Filter op persoon
- ✅ Indicator bij dagen met taken
- ✅ Voltooide taken history
- ✅ Presentatie modus voor groot scherm (via URL `?mode=presentation`)
- ✅ Meal planning (lunch/diner per dag)
- ✅ Swipe om taak te verwijderen
- ✅ Week navigatie in presentatie modus
- ✅ Profielfoto's instellen (via menu)
- ✅ PWA ondersteuning (opslaan op homescherm)
- ✅ PWA auto-update (altijd nieuwste versie)
- ✅ Statistieken (week/maand/jaar/alle tijden)

---

## Troubleshooting

### App laadt niet na deploy
- Wacht 1-2 minuten tot GitHub Pages klaar is met bouwen
- Check of de GitHub secrets correct zijn ingesteld

### Database problemen
- Ga naar Supabase dashboard > Table Editor
- Check of de tabellen correct zijn aangemaakt
- Controleer de RLS policies
- Voor profielfoto's: voeg een `avatar_url` kolom (type TEXT) toe aan de `users` tabel

### PIN werkt niet
- Controleer of gebruikers bestaan in Supabase:
  ```sql
  SELECT * FROM users;
  ```

### PWA laadt oude versie
- De app checkt automatisch op nieuwe versies bij het openen
- Als je een oude versie ziet, sluit de app dan af en open opnieuw
- Of verwijder de app van je homescherm en voeg opnieuw toe

---

## Versie History

- **v1.5** (feb 2026): 
  - Taken zijn nu voor iedereen afgevinkt (niet per gebruiker)
  - Auto-refresh bij app openen
  - Numeriek toetsenbord voor PIN invoer
  - PWA auto-update (altijd nieuwste versie)

- **v1.4** (feb 2026): 
  - Statistieken feature (week/maand/jaar/alle tijden)
  - Profielfoto's zichtbaar bij taken en filters
  - Betere mobile presentatie modus

- **v1.2** (feb 2026): 
  - Profielfoto's instellen per gebruiker
  - Presentatie modus ook op mobiel (dag-carousel)
  - PWA ondersteuning (app icon, homescherm)

- **v1.1** (feb 2026): 
  - Meal planning feature
  - Presentatie modus via URL parameter
  - Swipe to delete taken
  - Non-recurring taken (éénmalig)
  - Week navigatie in presentatie modus
  - Betere mobile UX

- **v1.0** (feb 2026): Initiele release
  - PIN login
  - Week/dag view
  - Taak toewijzing
  - Confetti animatie
