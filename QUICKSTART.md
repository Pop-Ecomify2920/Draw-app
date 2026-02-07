# Daily Dollar Lotto - Quick Start Guide

Complete setup guide to get the full stack running.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ installed and running
- Android Studio (optional, for mobile emulator)

## Setup Steps

### 1. Database Setup (5 minutes)

```powershell
# Navigate to database folder
cd database

# Copy environment template
cp .env.example .env

# Edit .env with your PostgreSQL password
# Then run migrations
psql -U postgres -d dailydollar -f init-all.sql
```

**Verify database setup:**
```powershell
psql -U postgres -d dailydollar -c "\dt"
```

You should see 8 tables: `users`, `draws`, `tickets`, `wallets`, `transactions`, `lobbies`, `lobby_members`, `refresh_tokens`, `password_reset_tokens`.

### 2. Backend Setup (3 minutes)

```powershell
# Navigate to backend folder
cd ../backend

# Install dependencies
npm install

# Edit .env file with your database credentials
# (A default .env is already created, update DB_PASSWORD if needed)

# Start the backend server
npm run dev
```

**Verify backend is running:**
```powershell
curl http://localhost:3000/health
```

Should return: `{"status":"healthy","timestamp":"...","database":"connected"}`

The backend server runs at: **http://localhost:3000**

### 3. Mobile App Setup (Web) (2 minutes)

```powershell
# Navigate back to project root
cd ..

# Install dependencies (if not already done)
npm install --legacy-peer-deps

# Start web version
npm run web
```

The app will open at: **http://localhost:8082**

### 4. Test the Full Stack

#### A. Create a User Account

```powershell
curl -X POST http://localhost:3000/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"username\":\"testuser\",\"password\":\"password123\"}'
```

Save the `accessToken` from the response.

#### B. Get Today's Draw

```powershell
curl http://localhost:3000/api/draws/today
```

#### C. Add Funds to Wallet

```powershell
curl -X POST http://localhost:3000/api/wallet/deposit `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -d '{\"amount\":10.00,\"source\":\"manual\"}'
```

#### D. Purchase a Ticket

```powershell
curl -X POST http://localhost:3000/api/tickets/purchase `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -d '{\"drawId\":\"DRAW_ID_FROM_TODAY\"}'
```

#### E. Check Wallet Balance

```powershell
curl http://localhost:3000/api/wallet `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Connect Mobile App to Backend

Update the API configuration in the mobile app:

**File:** `src/lib/api/config.ts`

```typescript
export const API_BASE_URL = 'http://localhost:3000/api';
```

For Android emulator, use: `http://10.0.2.2:3000/api`  
For iOS simulator, use: `http://localhost:3000/api`  
For physical device, use your computer's IP: `http://192.168.1.x:3000/api`

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Mobile App (React Native + Expo)                      │
│  Port: 8082 (web) | Expo Go (mobile)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Backend API (Node.js + Express + Socket.io)           │
│  Port: 3000                                             │
│  - REST API endpoints                                   │
│  - WebSocket server (real-time updates)                │
│  - JWT authentication                                   │
│  - Cryptographic ticket sealing                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL Database                                    │
│  Port: 5432                                             │
│  - 8 tables (users, draws, tickets, etc.)              │
│  - Atomic transactions                                  │
│  - Triggers for auto-updates                           │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints Summary

| Category | Endpoint | Method | Auth Required |
|----------|----------|--------|---------------|
| **Health** | `/health` | GET | No |
| **Auth** | `/api/auth/signup` | POST | No |
| | `/api/auth/signin` | POST | No |
| | `/api/auth/refresh` | POST | No |
| | `/api/auth/signout` | POST | No |
| **Draws** | `/api/draws/today` | GET | No |
| | `/api/draws/:drawId` | GET | No |
| | `/api/draws` | GET | No |
| | `/api/draws/execute` | POST | ✅ Admin |
| **Tickets** | `/api/tickets/purchase` | POST | ✅ |
| | `/api/tickets/my-tickets` | GET | ✅ |
| | `/api/tickets/:ticketId` | GET | ✅ |
| **Wallet** | `/api/wallet` | GET | ✅ |
| | `/api/wallet/transactions` | GET | ✅ |
| | `/api/wallet/deposit` | POST | ✅ |
| | `/api/wallet/withdraw` | POST | ✅ |

## Security Features Implemented

✅ **JWT Authentication**: Access tokens (15min) + refresh tokens (7 days)  
✅ **Password Hashing**: bcrypt with 10 rounds  
✅ **Cryptographic Ticket Sealing**: SHA-256 hash prevents tampering  
✅ **Atomic Transactions**: PostgreSQL ensures financial integrity  
✅ **Provably Fair Draws**: Commitment-reveal scheme  
✅ **CORS Protection**: Configurable allowed origins  
✅ **Helmet Security Headers**: XSS, clickjacking protection  
✅ **Input Validation**: express-validator on all inputs  

## Real-time Updates (WebSocket)

Connect to WebSocket server:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Join draw room for real-time prize pool updates
socket.emit('join:draw', drawId);

// Listen for updates
socket.on('draw:update', (data) => {
  console.log('Prize pool:', data.prizePool);
});
```

## Troubleshooting

### Database Connection Failed

- Check PostgreSQL is running: `psql -U postgres -l`
- Verify credentials in `backend/.env`
- Ensure database exists: `psql -U postgres -c "CREATE DATABASE dailydollar;"`

### Backend Port Already in Use

Change port in `backend/.env`:
```env
PORT=3001
```

### Mobile App Can't Connect to Backend

- Web: Use `http://localhost:3000`
- Android Emulator: Use `http://10.0.2.2:3000`
- Physical Device: Use your computer's IP (find with `ipconfig` on Windows)

### CORS Errors

Add your origin to `backend/.env`:
```env
ALLOWED_ORIGINS=http://localhost:8082,http://localhost:19006,http://10.0.2.2:8081
```

## Next Steps

1. ✅ Test all API endpoints
2. ⏳ Connect mobile app to backend
3. ⏳ Set up automated draw execution (cron job)
4. ⏳ Configure payment webhooks (RevenueCat, Stripe)
5. ⏳ Add email notifications
6. ⏳ Deploy to production (Render, Railway, etc.)

## Production Deployment Checklist

- [ ] Change all secrets in `.env` to secure random strings
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Enable rate limiting
- [ ] Set up automated backups
- [ ] Configure email service
- [ ] Set up payment webhooks
- [ ] Deploy to hosting platform

## Support

- Backend README: `backend/README.md`
- Database README: `database/README.md`
- Implementation Plan: `IMPLEMENTATION_PLAN.md`

---

**🎰 Daily Dollar Lotto - Built for fairness, security, and fun!**
