# KSTransport - Tidregistreringsløsning

En komplett Progressiv Web App (PWA) for tidregistrering av sjåfører innen lastebil/cargotransport.

## 🚛 Funksjoner

### For Sjåfører
- **Pålogging** med e-post og passord
- **Skiftregistrering** med start/slutt tid og pause
- **Bilvalg** fra nedtrekksliste med registreringsnummer
- **Sonevalg** for leveringsområder
- **Sendinger** - registrering av antall sendinger
- **Kommentarer** for hver registrering
- **Avvikrapportering** med type og beskrivelse
- **Forbedringsforslag** til ledelsen
- **Kalendervisning** med oversikt over registrerte dager
- **Daglig oversikt** med alle detaljer for valgt dag

### For Administratorer
- **Adminvisning** med alle registreringer
- **Filtrering** på sjåfør, dato, bil og sone
- **Dataeksport** til CSV-format
- **Avvikoversikt** og håndtering
- **Forbedringsforslag** administrasjon

## 🛠️ Teknologi

- **Frontend**: React/Next.js med Tailwind CSS og ShadCN UI
- **Backend**: Node.js/Express med REST API
- **Database**: PostgreSQL
- **PWA**: Service Worker, offline cache, "add to home screen"
- **Containerisering**: Docker og Docker Compose

## 📁 Prosjektstruktur

```
KSTransport/
├── backend/                 # Express API server
│   ├── routes/             # API endepunkter
│   ├── middleware/         # Autentisering og validering
│   ├── config/             # Database konfigurasjon
│   └── server.js           # Hovedserver fil
├── frontend/               # Next.js React app
│   ├── app/                # App router sider
│   ├── components/         # React komponenter
│   ├── contexts/           # React contexts
│   ├── lib/                # Utility funksjoner
│   └── public/             # Statiske filer og PWA assets
├── database/               # Database skjema og migrasjoner
│   └── init.sql            # Initial database setup
├── docker-compose.yml      # Docker orchestration
└── package.json           # Root package.json
```

## 🚀 Kom i gang

### Forutsetninger
- Docker og Docker Compose
- Node.js 18+ (for lokal utvikling)

### Installasjon og kjøring

1. **Klon prosjektet**
   ```bash
   git clone https://git.au11no.com/beetwenty/KSTransport.git
   cd KSTransport
   ```

2. **Start med Docker Compose**
   ```bash
   # Bygg og start alle tjenester
   docker-compose up --build
   ```

3. **Åpne applikasjonen**
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3001
   - Database: localhost:5432

### Demo påloggingsdetaljer
- **E-post**: ole.hansen@kstransport.no
- **Passord**: demo123

## ✅ Implementerte funksjoner

### Sjåfør-funksjoner
- ✅ **Pålogging** med e-post og passord
- ✅ **Dashboard** med oversikt over aktivt skift
- ✅ **Skiftregistrering** - start/slutt med pause og sendinger
- ✅ **Bil-velger** dropdown med registreringsnummer
- ✅ **Sone-velger** dropdown
- ✅ **Kommentarfelt** for skift
- ✅ **Avvik-registrering** med type og beskrivelse
- ✅ **Forbedringsforslag** med tittel og beskrivelse
- ✅ **Kalender-visning** med månedsoverikt
- ✅ **Dagvisning** med alle registreringer for valgt dag

### Admin-funksjoner
- ✅ **Admin-panel** med oversikt over alle data
- ✅ **Sjåfører-oversikt** med status
- ✅ **Biler-oversikt** med registreringsnummer
- ✅ **Soner-oversikt** med beskrivelser
- ✅ **Skift-oversikt** med alle registreringer
- ✅ **Avvik-oversikt** med status
- ✅ **Forbedringsforslag-oversikt** med admin-kommentarer
- ✅ **Dataeksport** til CSV-format

## 📱 PWA Funksjonalitet

### Installering
- Appen kan installeres som en native app på mobil og desktop
- "Add to Home Screen" funksjonalitet
- Standalone modus uten browser UI

### Offline Støtte
- Service Worker cacher viktige ressurser
- Offline registrering av skift
- Automatisk synkronisering når tilkobling gjenopprettes
- Offline-indikator i UI

## 🗄️ Database Skjema

### Tabeller
- **sjåfører** - Brukerinformasjon og autentisering
- **biler** - Flåteinformasjon med registreringsnummer
- **soner** - Leveringsområder
- **skift** - Tidregistreringer med detaljer
- **avvik** - Rapporterte problemer og avvik
- **forbedringsforslag** - Forslag fra sjåfører

## 🔧 Utvikling

### Lokal utvikling
```bash
# Start backend i utviklingsmodus
cd backend
npm install
npm run dev

# Start frontend i utviklingsmodus (ny terminal)
cd frontend
npm install
npm run dev
```

### Miljøvariabler
Opprett `.env` filer i backend og frontend mapper:

**backend/.env**
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://kstransport:kstransport123@localhost:5432/kstransport
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 📊 API Endepunkter

### Autentisering
- `POST /api/auth/login` - Pålogging
- `GET /api/auth/me` - Hent brukerinfo
- `PUT /api/auth/endre-passord` - Endre passord

### Skift
- `GET /api/skift` - Hent alle skift for sjåfør
- `POST /api/skift` - Opprett nytt skift
- `PUT /api/skift/:id` - Oppdater skift
- `DELETE /api/skift/:id` - Slett skift

### Data
- `GET /api/data/biler` - Hent alle biler
- `GET /api/data/soner` - Hent alle soner
- `GET /api/data/kalender` - Hent kalenderdata

### Avvik og Forbedringsforslag
- `GET /api/avvik` - Hent avvik for sjåfør
- `POST /api/avvik` - Rapporter avvik
- `GET /api/forbedringsforslag` - Hent forslag
- `POST /api/forbedringsforslag` - Send forslag

### Admin
- `GET /api/admin/registreringer` - Alle registreringer
- `GET /api/admin/avvik` - Alle avvik
- `GET /api/admin/eksporter` - Eksporter data til CSV

## 🔒 Sikkerhet

- JWT-basert autentisering
- Passord hashing med bcrypt
- Rate limiting på API endepunkter
- Input validering og sanitization
- CORS konfigurasjon
- Helmet.js for sikkerhetsheaders

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
