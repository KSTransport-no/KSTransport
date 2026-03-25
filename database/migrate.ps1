# Migrasjonsskript for KS Transport (PowerShell)
# Bruk: .\migrate.ps1 [migrasjonsnummer]

param(
    [string]$MigrationNumber = ""
)

# Database-tilkobling
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "postgres" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "kstransport" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "kstransport" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "kstransport123" }

# Funksjon for å kjøre migrasjoner
function Run-Migration {
    param($MigrationFile)
    
    $MigrationName = [System.IO.Path]::GetFileNameWithoutExtension($MigrationFile)
    
    Write-Host "🔄 Kjører migrasjon: $MigrationName" -ForegroundColor Yellow
    
    # Sjekk om migrasjonen allerede er kjørt
    $Exists = docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1 FROM migrations WHERE name = '$MigrationName';" 2>$null
    
    if ($Exists -and $Exists.Trim() -ne "") {
        Write-Host "✅ Migrasjon $MigrationName er allerede kjørt" -ForegroundColor Green
        return
    }
    
    # Kjør migrasjonen
    Get-Content $MigrationFile | docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME
    
    # Registrer migrasjonen
    docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -c "INSERT INTO migrations (name, executed_at) VALUES ('$MigrationName', NOW());"
    
    Write-Host "✅ Migrasjon $MigrationName fullført" -ForegroundColor Green
}

# Opprett migrations-tabell hvis den ikke eksisterer
Write-Host "🔧 Oppretter migrations-tabell..." -ForegroundColor Cyan
docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME -c @"
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"@ 2>$null

# Kjør alle migrasjoner hvis ingen spesifikk migrasjon er oppgitt
if ($MigrationNumber -eq "") {
    Write-Host "🚀 Kjører alle migrasjoner..." -ForegroundColor Cyan
    $MigrationFiles = Get-ChildItem -Path "database" -Filter "migrate_*.sql"
    foreach ($MigrationFile in $MigrationFiles) {
        Run-Migration $MigrationFile.FullName
    }
} else {
    # Kjør spesifikk migrasjon
    $MigrationFile = "database/migrate_$MigrationNumber.sql"
    if (Test-Path $MigrationFile) {
        Run-Migration $MigrationFile
    } else {
        Write-Host "❌ Migrasjon $MigrationFile ikke funnet" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🎉 Alle migrasjoner fullført!" -ForegroundColor Green
