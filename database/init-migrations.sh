#!/bin/bash

# Init-migrasjoner som kjører hver gang postgres-containeren starter
# Dette skriptet kjører automatisk når containeren starter

set -e

echo "🔄 Kjører startup-migrasjoner..."

# Vent til postgres er klar
until pg_isready -h localhost -p 5432 -U kstransport; do
  echo "⏳ Vent på at PostgreSQL starter..."
  sleep 2
done

echo "✅ PostgreSQL er klar, kjører migrasjoner..."

# Kjør startup-migrasjoner
psql -U kstransport -d kstransport -f /docker-entrypoint-initdb.d/startup-migrations.sql

echo "🎉 Startup-migrasjoner fullført!"
