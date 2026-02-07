# Database Reset for Deploy

When uploading the backend to production, run the reset script to clear all test/development data while keeping your admin account.

## What Gets Preserved
- **Admin account**: `ollie.bryant08@icloud.com` (username: `admin_ollie`)

## What Gets Cleared
- All other user accounts
- All wallets (admin wallet reset to $0)
- All tickets, transactions, lobbies
- All draws (today's draw is recreated fresh with provably fair seed)

## How to Run

### Windows (PowerShell)
```powershell
cd database
$env:PGPASSWORD = "your_db_password"
.\reset-for-deploy.ps1
```

Or with explicit connection:
```powershell
.\reset-for-deploy.ps1 -Host localhost -Database dailydollar -User postgres -Password "your_password"
```

### Direct psql
```bash
psql -U postgres -d dailydollar -f database/migrations/012_reset_for_deploy.sql
```

### Deploy Workflow
1. Run the reset script on your production database
2. Upload/deploy your backend
3. Admin can sign in with `ollie.bryant08@icloud.com` / your password
