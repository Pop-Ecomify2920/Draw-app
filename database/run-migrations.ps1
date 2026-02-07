# Daily Dollar Draw - Run Database Migrations
# Usage: .\run-migrations.ps1
# Set DATABASE_URL or use -ConnectionString parameter

param(
    [string]$ConnectionString = $env:DATABASE_URL,
    [string]$Host = $env:PGHOST ?? "localhost",
    [string]$Port = $env:PGPORT ?? "5432",
    [string]$Database = $env:PGDATABASE ?? "dailydollar",
    [string]$User = $env:PGUSER ?? "postgres",
    [string]$Password = $env:PGPASSWORD ?? ""
)

$ErrorActionPreference = "Stop"
$migrationsDir = Join-Path $PSScriptRoot "migrations"

if (-not (Test-Path $migrationsDir)) {
    Write-Error "Migrations folder not found: $migrationsDir"
    exit 1
}

# Get migration files in order
$migrations = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

if ($migrations.Count -eq 0) {
    Write-Error "No migration files found in $migrationsDir"
    exit 1
}

Write-Host "Running $($migrations.Count) migration(s)..." -ForegroundColor Cyan

if ($ConnectionString) {
    $env:PGPASSWORD = $Password
    foreach ($m in $migrations) {
        Write-Host "  Executing: $($m.Name)" -ForegroundColor Gray
        psql $ConnectionString -f $m.FullName
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Migration failed: $($m.Name)"
            exit 1
        }
    }
} else {
    $pgEnv = "PGPASSWORD=$Password"
    foreach ($m in $migrations) {
        Write-Host "  Executing: $($m.Name)" -ForegroundColor Gray
        $env:PGPASSWORD = $Password
        psql -h $Host -p $Port -U $User -d $Database -f $m.FullName
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Migration failed: $($m.Name)"
            exit 1
        }
    }
}

Write-Host "All migrations completed successfully." -ForegroundColor Green
