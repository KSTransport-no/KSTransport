# KS Transport

A full-stack Progressive Web App for shift tracking, incident reporting, and fleet management in the cargo/freight transport industry.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI / shadcn |
| Backend | Node.js, Express 4, REST API |
| Database | PostgreSQL 15 |
| Auth | JWT (bcryptjs), email-based password reset |
| Infra | Docker Compose, GitHub Actions CI |
| Monitoring | Sentry (frontend + backend) |
| API Docs | Swagger UI at `/api-docs` |

## Features

**Drivers**
- Clock in/out with vehicle, zone, deliveries, weight, and comments
- Multiple registration types: work shifts, vacation, sick leave, self-certification (egenmelding)
- Incident reporting with photo uploads
- Improvement suggestions
- Calendar view with monthly overview
- Real-time notifications
- Offline mode with background sync

**Admins**
- Dashboard with all registrations (filterable, paginated)
- Approve/reject shifts (single and bulk)
- Manage drivers, vehicles, zones, SGA codes, and assignments
- Incident and suggestion management with comments
- Invoicing overview (mark shifts as billed)
- CSV export for shifts, incidents, and suggestions
- Info board (phone numbers and codes for drivers)

**Platform**
- Installable PWA with offline support and service worker
- Live traffic data (TomTom API)
- Weather data (Yr.no API)
- Email notifications (SMTP via Nodemailer)
- Automatic database migrations on startup

## Project Structure

```
KSTransport/
├── backend/
│   ├── config/          # Database, Swagger spec
│   ├── middleware/       # Auth, caching
│   ├── routes/          # All API route handlers
│   ├── utils/           # Logger, email, cache, sanitizer, error handler
│   └── server.js
├── frontend/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # Reusable UI components
│   ├── contexts/        # Auth & PWA contexts
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # API client, offline sync, utilities
│   └── public/          # Service worker, manifest
├── database/
│   ├── init.sql         # Initial schema
│   └── startup-migrations.sql  # Auto-applied migrations
├── .github/workflows/   # CI pipeline
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)

### Quick Start

```bash
git clone https://git.au11no.com/beetwenty/KSTransport.git
cd KSTransport
cp .env.example .env     # Edit with your values
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3002 |
| Backend API | http://localhost:3001/api |
| API Docs (Swagger) | http://localhost:3001/api-docs |
| Adminer (DB UI) | http://localhost:8080 |

### Demo Login
- **Email**: ole.hansen@kstransport.no
- **Password**: demo123

### Local Development (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev    # http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev    # http://localhost:3002
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | Yes | — | Database password |
| `JWT_SECRET` | Yes | — | Signing secret (64+ chars recommended) |
| `POSTGRES_DB` | No | kstransport | Database name |
| `POSTGRES_USER` | No | kstransport | Database user |
| `NODE_ENV` | No | development | Environment mode |
| `JWT_EXPIRES_IN` | No | 48h | Token lifetime |
| `SMTP_HOST` | No | — | SMTP server (blank = log to console) |
| `SMTP_PORT` | No | 587 | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASSWORD` | No | — | SMTP password |
| `MAIL_FROM` | No | noreply@kstransport.no | Sender address |
| `FRONTEND_URL` | No | http://localhost:3002 | Used in password reset emails |
| `TOMTOM_API_KEY` | No | — | TomTom Traffic API key |
| `SENTRY_DSN_BACKEND` | No | — | Backend Sentry DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | No | — | Frontend Sentry DSN |

## API Overview

Full interactive docs available at `/api-docs` when the server is running. Key endpoint groups:

| Tag | Base Path | Description |
|-----|-----------|-------------|
| Auth | `/api/auth` | Login, profile, password change/reset |
| Skift | `/api/skift` | Shift CRUD, start/stop active shift |
| Avvik | `/api/avvik` | Incident reports with comments |
| Forbedringsforslag | `/api/forbedringsforslag` | Improvement suggestions with comments |
| Data | `/api/data` | Vehicles, zones, SGA codes, calendar, time registration |
| Admin | `/api/admin` | All admin operations, approvals, invoicing, CSV export |
| CRUD | `/api/crud` | Admin CRUD for drivers, vehicles, zones, assignments, SGA codes |
| Upload | `/api/upload` | Image upload for incidents (single/multiple) |
| Info | `/api/info` | Info board (phone numbers, codes) |
| Varslinger | `/api/varslinger` | Notifications (read, mark read, delete) |
| Trafikk | `/api/trafikk` | Live traffic data proxy (TomTom) |
| Weather | `/api/weather` | Weather data proxy (Yr.no) |

## Security

- JWT authentication with bcrypt password hashing
- Rate limiting (100 req/15min in production, 1000 in development)
- Helmet.js security headers with strict CSP
- Input sanitization on all endpoints
- CORS with configurable origins
- Path traversal protection on file uploads
- Email enumeration prevention on password reset
- Automatic database migrations (no manual SQL needed)

## CI/CD

GitHub Actions runs on push to `main` and on pull requests:

1. **Backend** — install, migrate test DB, health check smoke test
2. **Frontend** — install, lint (ESLint), build
3. **Docker** — build both images (main branch only)

## 📱 Mobiloptimalisering

- Responsivt design for alle skjermstørrelser
- Touch-vennlige knapper og interaksjoner
- Optimalisert for mobile browsers
- PWA manifest for native app-opplevelse
- Offline-first arkitektur

## 🗄️ Database-optimalisering

Prosjektet inkluderer omfattende database-optimaliseringer for å sikre rask ytelse:

### Indekser

Alle viktige queries har dedikerte indekser:
- **Skift-tabellen**: Composite indekser for `sjåfør_id + dato`, partial indekser for `fakturert = false` og `godkjent = false`
- **Avvik-tabellen**: Indekser for `dato`, `sjåfør_id + dato`, `status`, og `skift_id`
- **Forbedringsforslag**: Indekser for `sjåfør_id + status` og `opprettet`
- **Andre tabeller**: Indekser for `aktiv`, `epost`, og andre ofte brukte kolonner

Indeksene legges automatisk til ved migrasjoner.

### Connection Pooling

Connection pool er optimalisert med:
- **Max connections**: 20 (konfigurerbart via `DB_POOL_MAX`)
- **Min connections**: 5 (konfigurerbart via `DB_POOL_MIN`)
- **Idle timeout**: 30 sekunder
- **Query timeout**: 30 sekunder (forhindrer lange queries)

### Query Analyse

Bruk query analyzer for å finne trege queries:

```bash
# Analyser en spesifikk query
node backend/scripts/analyze-queries.js analyze "SELECT * FROM skift WHERE sjåfør_id = $1" 1

# Sjekk indeks bruk for en tabell
node backend/scripts/analyze-queries.js check-indexes skift

# Finn trege queries (over 1000ms)
node backend/scripts/analyze-queries.js slow-queries 1000

# Foreslå nye indekser
node backend/scripts/analyze-queries.js suggest-indexes
```

### Miljøvariabler for Database

```env
DB_POOL_MAX=20                    # Maks antall connections
DB_POOL_MIN=5                     # Minimum antall connections
DB_POOL_IDLE_TIMEOUT=30000        # Idle timeout i ms
DB_POOL_CONNECTION_TIMEOUT=2000   # Connection timeout i ms
DB_STATEMENT_TIMEOUT=30000        # Statement timeout i ms
DB_QUERY_TIMEOUT=30000            # Query timeout i ms
```

## 🚀 Produksjonsdeployment

1. **Oppdater miljøvariabler** for produksjon
2. **Bygg Docker images**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```
3. **Deploy til din plattform** (AWS, Google Cloud, Azure, etc.)

## 📄 Lisens

MIT License - se LICENSE fil for detaljer.

## 🤝 Bidrag

1. Fork prosjektet
2. Opprett feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit endringene (`git commit -m 'Add some AmazingFeature'`)
4. Push til branch (`git push origin feature/AmazingFeature`)
5. Åpne Pull Request

## 📞 Support

For spørsmål eller support, kontakt utviklingsteamet eller opprett en issue i prosjektet.

---

**KSTransport** - Moderne tidregistrering for transportbransjen 🚛
