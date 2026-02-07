# Daily Dollar Lotto - Full Integration Test

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Daily Dollar Lotto - Full Stack Integration Test     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

try {
    # 1. Sign In
    Write-Host "1️⃣  Signing in user..." -ForegroundColor Yellow
    $signInBody = @{
        email = "demo@dailydollar.com"
        password = "password123"
    } | ConvertTo-Json
    
    $authResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/auth/signin" `
        -Headers @{"Content-Type"="application/json"} `
        -Body $signInBody
    
    $accessToken = $authResponse.tokens.accessToken
    Write-Host "✅ Signed in as: $($authResponse.user.username)" -ForegroundColor Green
    
    # 2. Check Wallet
    Write-Host "`n2️⃣  Checking wallet balance..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $accessToken"
    }
    
    $wallet = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/wallet" -Headers $headers
    Write-Host "💰 Current Balance: `$$($wallet.wallet.balance)" -ForegroundColor Green
    
    # 3. Add Funds (if balance is low)
    if ($wallet.wallet.balance -lt 5) {
        Write-Host "`n3️⃣  Adding funds to wallet..." -ForegroundColor Yellow
        $depositBody = @{
            amount = 25.00
            source = "manual"
            referenceId = "TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
        } | ConvertTo-Json
        
        $depositHeaders = @{
            "Authorization" = "Bearer $accessToken"
            "Content-Type" = "application/json"
        }
        
        $deposit = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/wallet/deposit" `
            -Headers $depositHeaders `
            -Body $depositBody
        Write-Host "✅ Deposited `$25.00" -ForegroundColor Green
        Write-Host "💰 New Balance: `$$($deposit.balance)" -ForegroundColor Green
    }
    
    # 4. Get Today's Draw
    Write-Host "`n4️⃣  Getting today's draw..." -ForegroundColor Yellow
    $draw = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/draws/today"
    Write-Host "🎰 Draw ID: $($draw.draw.id)" -ForegroundColor Green
    Write-Host "💎 Prize Pool: `$$($draw.draw.prize_pool)" -ForegroundColor Green
    Write-Host "🎫 Total Entries: $($draw.draw.total_entries)" -ForegroundColor Green
    Write-Host "📊 Status: $($draw.draw.status)" -ForegroundColor Green
    
    # 5. Purchase Ticket
    Write-Host "`n5️⃣  Purchasing ticket..." -ForegroundColor Yellow
    $ticketBody = @{
        drawId = $draw.draw.id
    } | ConvertTo-Json
    
    $ticketHeaders = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $ticket = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/tickets/purchase" `
        -Headers $ticketHeaders `
        -Body $ticketBody
    
    Write-Host "✅ Ticket purchased!" -ForegroundColor Green
    Write-Host "🎫 Ticket ID: $($ticket.ticket.id)" -ForegroundColor Green
    Write-Host "📍 Position: $($ticket.ticket.position)" -ForegroundColor Green
    Write-Host "🔒 Seal: $($ticket.ticket.seal.Substring(0, 20))..." -ForegroundColor Green
    Write-Host "💎 Updated Prize Pool: `$$($ticket.prizePool)" -ForegroundColor Green
    Write-Host "🎫 Total Entries: $($ticket.totalEntries)" -ForegroundColor Green
    Write-Host "💰 Remaining Balance: `$$($ticket.newBalance)" -ForegroundColor Green
    
    # 6. Get My Tickets
    Write-Host "`n6️⃣  Fetching my tickets..." -ForegroundColor Yellow
    $myTickets = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/tickets/my-tickets" `
        -Headers $headers
    Write-Host "📊 Total Tickets: $($myTickets.tickets.Count)" -ForegroundColor Green
    
    # 7. Check Transactions
    Write-Host "`n7️⃣  Checking transaction history..." -ForegroundColor Yellow
    $transactions = Invoke-RestMethod -Method GET -Uri "$baseUrl/api/wallet/transactions" `
        -Headers $headers
    Write-Host "📝 Recent Transactions: $($transactions.transactions.Count)" -ForegroundColor Green
    foreach ($tx in $transactions.transactions | Select-Object -First 3) {
        $symbol = if ($tx.type -eq 'credit') { "+" } else { "-" }
        Write-Host "  $symbol`$$($tx.amount) - $($tx.type) - $($tx.status)" -ForegroundColor Gray
    }
    
    Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║           ✅ ALL TESTS PASSED SUCCESSFULLY!            ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Green
    
    Write-Host "📊 Final Summary:" -ForegroundColor Cyan
    Write-Host "  User: $($authResponse.user.username)" -ForegroundColor White
    Write-Host "  Email: $($authResponse.user.email)" -ForegroundColor White
    Write-Host "  Balance: `$$($ticket.newBalance)" -ForegroundColor White
    Write-Host "  Tickets: $($myTickets.tickets.Count)" -ForegroundColor White
    Write-Host "  Draw: $($draw.draw.status) (Prize: `$$($ticket.prizePool))`n" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
