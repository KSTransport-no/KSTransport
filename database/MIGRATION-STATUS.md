# 📊 Database Migrasjonsstatus

## 🔍 Hva kjører automatisk?

### ✅ **startup-migrations.sql** - KJØRER AUTOMATISKT
- **Når:** Hver gang `migrations`-containeren starter
- **Hvordan:** Via `docker-compose.yml` → `migrations` service
- **Rekkefølge:** 
  1. Postgres starter og blir klar (healthcheck)
  2. Migrations-containeren venter på postgres
  3. Kjører `startup-migrations.sql`
  4. Backend starter etter at migrasjoner er fullført
- **Status:** ✅ **FULLSTENDIG AUTOMATISK**

### ⚠️ **init.sql** - KJØRER KUN VED FØRSTE OPPRETTELSE
- **Når:** Kun når databasen opprettes første gang (volume er tom)
- **Hvordan:** Via PostgreSQL's `/docker-entrypoint-initdb.d/` mekanisme
- **Problem:** Hvis databasen allerede eksisterer (volume er persistent), kjører den **IKKE**
- **Status:** ⚠️ **IKKE PÅLITELIG FOR EKSISTERENDE DATABASER**

### ❌ **migrate_*.sql** filer - KJØRER IKKE AUTOMATISKT
- **Filer:** `migrate_add_sone_column.sql`, `migrate_add_vekt_column.sql`, etc.
- **Status:** ❌ **MÅ KJØRES MANUELT** (hvis de ikke allerede er inkludert i `startup-migrations.sql`)
- **Bruk:** Disse er gamle migrasjonsfiler som kan være inkludert i `startup-migrations.sql`

## 🎯 Løsning

Alle nødvendige migrasjoner er nå inkludert i `startup-migrations.sql`, som kjører automatisk.

**For å sikre at alt kjører:**

1. **Sjekk at migrations-containeren kjører:**
   ```bash
   docker-compose ps migrations
   ```

2. **Sjekk migrasjonsloggene:**
   ```bash
   docker-compose logs migrations
   ```

3. **Sjekk hvilke migrasjoner som er kjørt:**
   ```bash
   docker-compose exec postgres psql -U kstransport -d kstransport -c "SELECT * FROM migrations ORDER BY executed_at;"
   ```

4. **Sjekk at tabellene eksisterer:**
   ```bash
   docker-compose exec postgres psql -U kstransport -d kstransport -c "\dt"
   ```

## 🔧 Hvis tabeller mangler

Hvis tabeller mangler selv etter at migrasjoner har kjørt:

1. **Restart migrations-containeren:**
   ```bash
   docker-compose restart migrations
   ```

2. **Eller restart hele systemet:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. **Eller kjør migrasjoner manuelt:**
   ```bash
   docker-compose exec postgres psql -U kstransport -d kstransport -f /startup-migrations.sql
   ```

## 📋 Rekkefølge på migrasjoner

`startup-migrations.sql` kjører migrasjoner i denne rekkefølgen:

1. ✅ Oppretter `migrations`-tabell
2. ✅ Oppretter grunnleggende tabeller (sjåfører, biler, soner, skift) - **KRITISK**
3. ✅ Kjører alle andre migrasjoner (sone, vekt, info_kort, etc.)
4. ✅ Legger til dummy-data
5. ✅ Oppretter performance-indekser

## ⚠️ Viktig

- **init.sql** er kun backup/fallback - ikke avhengig av den
- **startup-migrations.sql** er hovedmekanismen - denne må alltid kjøre
- Alle tabeller opprettes i `startup-migrations.sql` uavhengig av `init.sql`

