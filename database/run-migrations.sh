#!/bin/bash
# Daily Dollar Draw - Run Database Migrations
# Usage: ./run-migrations.sh
# Set DATABASE_URL or PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: Migrations folder not found: $MIGRATIONS_DIR"
    exit 1
fi

echo "Running migrations..."

for f in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$f" ] || continue
    echo "  Executing: $(basename "$f")"
    if [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f "$f"
    else
        psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d "${PGDATABASE:-dailydollar}" -f "$f"
    fi
done

echo "All migrations completed successfully."
