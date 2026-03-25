#!/bin/bash

# Migrasjonsskript for KS Transport
# Bruk: ./migrate.sh [migrasjonsnummer]

set -e

# Database-tilkobling
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-kstransport}
DB_USER=${DB_USER:-kstransport}
DB_PASSWORD=${DB_PASSWORD:-kstransport123}

# Funksjon for å kjøre migrasjoner
run_migration() {
    local migration_file=$1
    local migration_name=$(basename $migration_file .sql)
    
    echo "🔄 Kjører migrasjon: $migration_name"
    
    # Sjekk om migrasjonen allerede er kjørt
    local exists=$(docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1 FROM migrations WHERE name = '$migration_name';" 2>/dev/null || echo "")
    
    if [ -n "$exists" ]; then
        echo "✅ Migrasjon $migration_name er allerede kjørt"
        return 0
    fi
    
    # Kjør migrasjonen
    docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME < $migration_file
    
    # Registrer migrasjonen
    docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -c "INSERT INTO migrations (name, executed_at) VALUES ('$migration_name', NOW());"
    
    echo "✅ Migrasjon $migration_name fullført"
}

# Opprett migrations-tabell hvis den ikke eksisterer
echo "🔧 Oppretter migrations-tabell..."
docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" 2>/dev/null || true

# Kjør alle migrasjoner hvis ingen spesifikk migrasjon er oppgitt
if [ $# -eq 0 ]; then
    echo "🚀 Kjører alle migrasjoner..."
    for migration in database/migrate_*.sql; do
        if [ -f "$migration" ]; then
            run_migration "$migration"
        fi
    done
else
    # Kjør spesifikk migrasjon
    migration_file="database/migrate_$1.sql"
    if [ -f "$migration_file" ]; then
        run_migration "$migration_file"
    else
        echo "❌ Migrasjon $migration_file ikke funnet"
        exit 1
    fi
fi

echo "🎉 Alle migrasjoner fullført!"
