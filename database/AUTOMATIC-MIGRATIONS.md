# 🚀 Automatiske Migrasjoner

Dette systemet sikrer at alle database-migrasjoner kjører automatisk når du kjører `docker-compose up -d --build` på serveren.

## 🔧 Hvordan det fungerer

### **1. Migrasjons-container**
- En egen `migrations`-container kjører automatisk
- Venter på at postgres er klar (healthcheck)
- Kjører alle startup-migrasjoner
- Avslutter når migrasjoner er fullført

### **2. Service-dependencies**
```
postgres (med healthcheck)
    ↓
migrations (kjører migrasjoner)
    ↓
backend (starter etter migrasjoner)
    ↓
frontend (starter etter backend)
```

### **3. Idempotente migrasjoner**
- Migrasjoner kjører kun én gang
- Spores i `migrations`-tabellen
- Trygt å kjøre flere ganger

## 📁 Filer

- `startup-migrations.sql` - Migrasjoner som kjører automatisk
- `init.sql` - Opprinnelig schema (kun ved første opprettelse)
- `docker-compose.yml` - Konfigurasjon med migrasjons-container

## 🎯 Bruk

### **På serveren:**
```bash
# Kjør hele systemet med automatiske migrasjoner
docker-compose up -d --build

# Migrasjoner kjører automatisk i riktig rekkefølge:
# 1. postgres starter
# 2. migrations kjører migrasjoner
# 3. backend starter
# 4. frontend starter
```

### **Sjekk migrasjoner:**
```bash
# Se hvilke migrasjoner som er kjørt
docker-compose exec postgres psql -U kstransport -d kstransport -c "SELECT * FROM migrations;"

# Sjekk at info_kort tabellen eksisterer
docker-compose exec postgres psql -U kstransport -d kstransport -c "\dt info_kort"
```

## ✨ Fordeler

- ✅ **Automatisk** - Ingen manuell migrasjon nødvendig
- ✅ **Sikker** - Kjører kun én gang per migrasjon
- ✅ **Rekkefølge** - Services starter i riktig rekkefølge
- ✅ **Robust** - Healthchecks sikrer at postgres er klar
- ✅ **Fremtidssikker** - Nye migrasjoner legges til automatisk

## 📋 Tilgjengelige migrasjoner

- `add_sone_column` - Legger til sone-kolonne i skift-tabellen (fri tekst)
- `add_vekt_column` - Legger til vekt-kolonne i skift-tabellen (kg)
- `add_bilde_url_column` - Legger til bilde_url-kolonne i avvik-tabellen (bilder)
- `add_info_kort_table` - Oppretter info_kort-tabellen (telefonnumre og koder)
- `add_admin_id_column` - Legger til admin_id-kolonne i avvik-tabellen (hvem som kommenterte)
- `add_admin_id_column_forbedringsforslag` - Legger til admin_id-kolonne i forbedringsforslag-tabellen (hvem som kommenterte)

## 🔄 Legge til nye migrasjoner

1. Opprett ny migrasjon i `startup-migrations.sql`
2. Legg til migrasjonsnavn i `migrations`-tabellen
3. Deploy til server med `docker-compose up -d --build`

Migrasjonen kjører automatisk! 🎉
