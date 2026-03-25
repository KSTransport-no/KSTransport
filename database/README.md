# Database Migrasjoner

Dette mappen inneholder migrasjonsskript for KS Transport databasen.

## 📁 Filer

- `init.sql` - Opprinnelig database-schema (kjører kun ved første opprettelse)
- `migrate.sh` - Migrasjonsskript for Linux/Mac
- `migrate.ps1` - Migrasjonsskript for Windows PowerShell
- `migrate_*.sql` - Individuelle migrasjonsfiler

## 🚀 Bruk

### På serveren (Linux/Mac):
```bash
# Kjør alle migrasjoner
./database/migrate.sh

# Kjør spesifikk migrasjon
./database/migrate.sh add_info_table
```

### På serveren (Windows):
```powershell
# Kjør alle migrasjoner
.\database\migrate.ps1

# Kjør spesifikk migrasjon
.\database\migrate.ps1 add_info_table
```

### Manuelt (hvis migrasjonsskript ikke fungerer):
```bash
# Kjør migrasjon direkte
docker-compose exec postgres psql -U kstransport -d kstransport -f database/migrate_add_info_table.sql
```

## 📋 Tilgjengelige migrasjoner

- `migrate_add_sone_column.sql` - Legger til sone-kolonne i skift-tabellen
- `migrate_add_vekt_column.sql` - Legger til vekt-kolonne i skift-tabellen  
- `migrate_add_info_table.sql` - Oppretter info_kort-tabellen

## 🔧 Migrasjonssystem

Migrasjonssystemet:
1. Oppretter `migrations`-tabell for å holde styr på kjørede migrasjoner
2. Sjekker om migrasjonen allerede er kjørt
3. Kjører kun nye migrasjoner
4. Registrerer kjøring i `migrations`-tabellen

## ⚠️ Viktig

- **init.sql** kjører kun ved første database-opprettelse
- Bruk **migrasjonsskript** for eksisterende databaser
- Migrasjoner er **idempotente** - trygt å kjøre flere ganger
