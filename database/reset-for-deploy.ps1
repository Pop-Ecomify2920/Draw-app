# Reset database for fresh deploy - keeps only admin account
# Run before uploading backend: .\database\reset-for-deploy.ps1
#
# Preserves: ollie.bryant08@icloud.com (admin)
# Clears: All other users, wallets (reset to 0), tickets, transactions, lobbies, draws

param(
    [string]$Host = $env:PGHOST ?? "localhost",
    [string]$Port = $env:PGPORT ?? "5432",
    [string]$Database = $env:PGDATABASE ?? "dailydollar",
    [string]$User = $env:PGUSER ?? "postgres",
    [string]$Password = $env:PGPASSWORD ?? ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resetFile = Join-Path $scriptDir "migrations\012_reset_for_deploy.sql"

if (-not (Test-Path $resetFile)) {
    Write-Error "Reset script not found: $resetFile"
    exit 1
}

Write-Host "Resetting database for deploy (preserving admin)..." -ForegroundColor Yellow
$env:PGPASSWORD = $Password
psql -h $Host -p $Port -U $User -d $Database -f $resetFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Reset failed"
    exit 1
}
Write-Host "Reset complete. Admin account preserved. All other data cleared." -ForegroundColor Green
