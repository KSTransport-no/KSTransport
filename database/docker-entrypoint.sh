#!/bin/bash
set -e

# Kjør opprinnelig postgres entrypoint
/docker-entrypoint.sh "$@"

# Kjør migrasjoner etter at postgres er startet
echo "🔄 Kjører startup-migrasjoner..."
psql -U kstransport -d kstransport -f /docker-entrypoint-initdb.d/startup-migrations.sql
echo "🎉 Startup-migrasjoner fullført!"
