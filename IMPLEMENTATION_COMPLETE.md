# Implementation Complete — Backend & Frontend Integration

**Date:** February 4, 2026

---

## Backend Changes

### Phase 1: Draw engine & tickets
1. **1% admin fee** – Winner receives 99%, admin 1% (`draws.js`)
2. **Max 1 ticket per user per draw** – Enforced in `tickets.js`
3. **WebSocket broadcast** – `broadcastPrizePoolUpdate()` called after each ticket purchase

### Phase 2: Responsible play
1. **Schema** – `004_responsible_play.sql`: `self_excluded_until`, `spending_limit_daily`, `spending_limit_monthly`
2. **Middleware** – `checkSelfExclusion`, `checkSpendingLimits` in `responsiblePlay.js`
3. **API** – `GET/PATCH /api/users/me` in `users.js`
4. **Applied to** – Ticket purchase, withdrawal, lobby seed

### Phase 3: Idempotency & webhook
1. **Schema** – `005_idempotency.sql`: `idempotency_keys` table
2. **Middleware** – `idempotencyMiddleware()` for deposit
3. **Webhook** – `POST /api/webhooks/revenuecat` for RevenueCat

### Phase 4: Lobby / rooms (Model A)
1. **Schema** – `006_lobby_model_a.sql`: `code`, `prize_pool` on lobbies
2. **Routes** – `lobby.js`:
   - `POST /api/lobby/create`
   - `POST /api/lobby/join`
   - `POST /api/lobby/:id/leave`
   - `GET /api/lobby/:id`
   - `GET /api/lobby/my-rooms/list`
   - `POST /api/lobby/:id/seed` (host seeds pot)
   - `POST /api/lobby/:id/draw` (host triggers draw, 99/1 split)

### Phase 5: Draw automation
1. **Cron** – `drawScheduler.js` with `node-cron` at 00:00 UTC
2. **Secrets** – `X-Cron-Secret` for execute/create-next
3. **Config** – `CRON_ENABLED`, `CRON_SECRET` in `.env`

### Phase 6: Rate limiting
1. **Auth** – 10 req/min for signin/signup
2. **API** – 100 req/min for `/api/`
3. **Package** – `express-rate-limit`

---

## Frontend Integration

### Hooks
- **useLottery** – Uses `BackendLotteryService` when `isApiConfigured()`
- **useUser** – Uses `BackendUserService` and `BackendWalletService`
- **useRooms** – Uses `BackendLobbyService`

### Screens
- **Home** – Wallet from API, ticket check from `useTickets`, “View Your Ticket” when already purchased
- **Purchase** – Uses `BackendLotteryService.purchaseTicket()` (max 1 per draw enforced by backend)
- **Profile / Self-Exclusion / Spending Limits** – Use `BackendUserService`
- **Create Room / Join Room / Room [id]** – Use `BackendLobbyService`

### API layer
- **BackendUserService** – `getProfile`, `updateResponsiblePlay`
- **BackendLobbyService** – `createRoom`, `joinRoom`, `leaveRoom`, `getRoom`, `getMyRooms`, `seedPot`, `triggerDraw`
- **Config** – Endpoints for users and lobby

---

## Migrations

Run in order:

```powershell
$env:PGPASSWORD='12345678'

psql -U postgres -d dailydollar -f database/migrations/003_admin_and_fee.sql
psql -U postgres -d dailydollar -f database/migrations/004_responsible_play.sql
psql -U postgres -d dailydollar -f database/migrations/005_idempotency.sql
psql -U postgres -d dailydollar -f database/migrations/006_lobby_model_a.sql
psql -U postgres -d dailydollar -f database/migrations/007_age_verification.sql
```

---

## 18+ Age Verification

- Sign-up requires **date of birth** and **confirmation** that the user is 18+
- Backend validates age before creating account
- `date_of_birth` stored in `users` table (migration 007)

---

## Start Commands

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
npm run web
```

---

## WebSocket (implemented)

- `socket.io-client` installed
- Home screen connects when authenticated and subscribes to `draw:update`
- Prize pool and entry count update in real time on ticket purchase

---

## New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/draws/last-winner` | Most recent draw winner for Home display |
| GET | `/api/users/me` | User profile and responsible play settings |
| PATCH | `/api/users/me` | Update self-exclusion and spending limits |
| POST | `/api/webhooks/revenuecat` | RevenueCat purchase webhook |
| POST | `/api/lobby/create` | Create room |
| POST | `/api/lobby/join` | Join by code |
| POST | `/api/lobby/:id/leave` | Leave room |
| GET | `/api/lobby/:id` | Room details |
| GET | `/api/lobby/my-rooms/list` | User’s rooms |
| POST | `/api/lobby/:id/seed` | Host seeds pot |
| POST | `/api/lobby/:id/draw` | Host triggers draw |

---

**Backend and frontend are fully integrated.**
