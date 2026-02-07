# Daily Dollar Draw — Database

PostgreSQL database schema and migrations for the Daily Dollar Draw application.

## Prerequisites

- **PostgreSQL 15+** installed and running
- `psql` command-line tool (included with PostgreSQL)

## Quick Start

### 1. Create the database (if it doesn't exist)

```sql
CREATE DATABASE dailydollar;
```

Or via command line:

```bash
# Windows (PowerShell)
createdb -U postgres dailydollar

# Or using psql
psql -U postgres -c "CREATE DATABASE dailydollar;"
```

### 2. Run migrations

**Option A: Using environment variables (Windows PowerShell)**

```powershell
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGDATABASE = "dailydollar"
$env:PGUSER = "postgres"
$env:PGPASSWORD = "your_password"

.\run-migrations.ps1
```

**Option B: Using connection string**

```powershell
$env:DATABASE_URL = "postgresql://postgres:your_password@localhost:5432/dailydollar"
.\run-migrations.ps1
```

**Option C: Run combined init file (from project root)**

```powershell
cd C:\path\to\project
psql -U postgres -d dailydollar -f database/init-all.sql
```

**Option D: Run SQL files manually**

```powershell
cd database
psql -U postgres -d dailydollar -f migrations/001_schema.sql
psql -U postgres -d dailydollar -f migrations/002_seed.sql
```

**Option E: Unix / Mac / Linux**

```bash
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=dailydollar
export PGUSER=postgres
export PGPASSWORD=your_password

chmod +x run-migrations.sh
./run-migrations.sh
```

## Schema Overview

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, username, password hash) |
| `refresh_tokens` | JWT refresh token storage |
| `wallets` | User wallet balances (auto-created on user signup) |
| `draws` | Daily lottery draws (prize pool, commitment hash, status) |
| `tickets` | Purchased tickets with SHA-256 cryptographic seal |
| `transactions` | Deposit, withdrawal, ticket purchase, prize win records |
| `lobbies` | Private draw rooms |
| `lobby_members` | Room participants and their tickets |
| `password_reset_tokens` | Password reset flow |

## Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Example: `postgresql://postgres:mypass@localhost:5432/dailydollar`

## Verify Installation

After running migrations:

```sql
-- Connect to database
psql -U postgres -d dailydollar

-- List tables
\dt

-- Check today's draw exists
SELECT * FROM draws WHERE draw_date = CURRENT_DATE;
```

## Migration Files

- `001_schema.sql` — Creates all tables, indexes, triggers
- `002_seed.sql` — Creates today's open draw (if not exists)
