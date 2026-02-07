# Daily Dollar Draw — Full Implementation Plan
## Step-by-Step Backend & Frontend Integration

**Version:** 1.0  
**Date:** February 3, 2026  
**Estimated Total:** 5–6 weeks (adjust based on availability)

---

## Overview

This plan implements all features from the Backend Implementation Plan doc and fully integrates the Expo/React Native frontend with the Node.js backend. Tasks are ordered by dependency and split into **Backend** and **Frontend** work within each phase.

---

## Phase 0: Prerequisites & Environment

**Duration:** 1 day  
**Goal:** Ensure clean baseline and tooling.

### Step 0.1: Environment Check
- [ ] Backend runs: `cd backend && npm run dev`
- [ ] Frontend runs: `npm run web` (or `expo start`)
- [ ] PostgreSQL running, `dailydollar` database exists
- [ ] `.env` (root) has `EXPO_PUBLIC_API_URL=http://localhost:3000/api`
- [ ] `backend/.env` has correct `DB_*` and `JWT_*` values

### Step 0.2: Baseline Test
- [ ] Sign up new user → appears in `users` table
- [ ] Sign in → receives tokens
- [ ] GET `/api/wallet` returns balance
- [ ] GET `/api/draws/today` returns today's draw

---

## Phase 1: Quick Wins (Draw Engine & Tickets)

**Duration:** 2–3 days  
**Goal:** 1% fee, max 1 ticket per draw, WebSocket broadcast.

---

### Step 1.1: Add 1% Admin Fee to Draw Settlement

**Backend**

1. **Admin wallet**
   - Add migration or SQL: ensure admin user exists (e.g. `admin@dailydollar.com`) and has a wallet.
   - Or use a config `ADMIN_USER_ID` / `ADMIN_WALLET_ID`.

2. **Update `backend/src/routes/draws.js` – `/execute`**
   - After determining winner and getting `prizePool`:
     ```javascript
     const adminFee = Math.floor(prizePool * 0.01 * 100) / 100;  // 1%, rounded down
     const winnerAmount = prizePool - adminFee;
     ```
   - Credit winner: `winnerAmount` (not full `prizePool`).
   - Credit admin wallet: `adminFee`.
   - Update ticket `prize_amount` to `winnerAmount`.
   - Insert two transactions: `prize_win` (winner), `admin_fee` (admin).
   - All inside existing transaction.

3. **Verify**
   - Run draw with 2+ tickets.
   - Check winner balance and admin balance; confirm 99% / 1% split.

**Frontend**

- No UI change if wallet/transaction display is generic.
- Optional: show “99% of pot to winner” in draw copy.

---

### Step 1.2: Enforce Max 1 Ticket Per User Per Draw

**Backend**

1. **Update `backend/src/routes/tickets.js` – `/purchase`**
   - Inside transaction, before deducting balance:
     ```javascript
     const existingCount = await client.query(
       'SELECT COUNT(*) FROM tickets WHERE user_id = $1 AND draw_id = $2',
       [userId, drawId]
     );
     if (parseInt(existingCount.rows[0].count) >= 1) {
       throw Object.assign(new Error('Max 1 ticket per draw per user'), { statusCode: 400 });
     }
     ```

2. **Verify**
   - Buy one ticket for a draw → success.
   - Buy second ticket for same draw → 400 with clear message.

**Frontend**

1. **Update `src/app/(tabs)/index.tsx` (Home)**
   - Disable “Buy Ticket” when user already has a ticket for today’s draw.
   - Use `BackendLotteryService.getTickets()` (or equivalent) to check.

2. **Update `src/app/purchase.tsx`**
   - Show error message from API when 400 (“Max 1 ticket per draw”).

---

### Step 1.3: Wire WebSocket Broadcast on Ticket Purchase

**Backend**

1. **Update `backend/src/routes/tickets.js`**
   - Import: `import { broadcastPrizePoolUpdate } from '../websocket/index.js';`
   - After successful `transaction()` and before `res.status(201).json(...)`:
     ```javascript
     broadcastPrizePoolUpdate(drawId, result.draw.prize_pool, result.draw.total_entries);
     ```

2. **Verify**
   - Two browser tabs: one buys ticket, other should see updated pot (once frontend subscribes).

**Frontend**

1. **Create `src/lib/websocket/socketClient.ts`**
   - Use `socket.io-client`.
   - Connect with `auth: { token: accessToken }`.
   - Emit `join:draw` with current draw ID when on Home.
   - Listen for `draw:update` and update local state / invalidate React Query.

2. **Update `src/app/(tabs)/index.tsx`**
   - Connect socket when user is authenticated and on Home.
   - On `draw:update`, update prize pool and entry count (or refetch).
   - Disconnect / leave room when navigating away.

3. **Optional: fallback polling**
   - If WebSocket fails, poll `GET /api/draws/today` every 5s.

---

## Phase 2: Responsible Play (Self-Exclusion & Spending Limits)

**Duration:** 3–4 days  
**Goal:** Enforce limits server-side; wire Profile UI.

---

### Step 2.1: Database Schema for Responsible Play

**Backend**

1. **Migration `003_responsible_play.sql`**
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS self_excluded_until TIMESTAMPTZ;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS spending_limit_daily DECIMAL(12,2);
   ALTER TABLE users ADD COLUMN IF NOT EXISTS spending_limit_monthly DECIMAL(12,2);
   ```
   - Run migration against `dailydollar`.

---

### Step 2.2: Backend Enforcement

**Backend**

1. **Create `backend/src/middleware/responsiblePlay.js`**
   - `checkSelfExclusion(req, res, next)`: if `user.self_excluded_until > NOW()`, return 403.
   - `checkSpendingLimits(req, res, next)`: before purchase/deposit/withdraw, sum user’s spending for today/month; if over limit, return 403.
   - Apply to: ticket purchase, room ticket purchase, withdrawal, optional deposit (if you want limits on deposits).

2. **User profile API**
   - `GET /api/users/me` – return user + `self_excluded_until`, `spending_limit_daily`, `spending_limit_monthly`.
   - `PATCH /api/users/me` – allow updating these fields (with validation).

3. **Apply middleware**
   - Add `checkSelfExclusion` and `checkSpendingLimits` to purchase and withdrawal routes.

---

### Step 2.3: Frontend Integration

**Frontend**

1. **`BackendUserService` (or extend `backend.ts`)**
   - `getProfile()` → `GET /api/users/me`
   - `updateResponsiblePlay({ selfExcludedUntil, spendingLimitDaily, spendingLimitMonthly })` → `PATCH /api/users/me`

2. **`src/app/self-exclusion.tsx`**
   - Replace mock with `updateResponsiblePlay`.
   - Show current `self_excluded_until` and allow set/clear.

3. **`src/app/spending-limits.tsx`**
   - Replace mock with `updateResponsiblePlay`.
   - Show and edit `spending_limit_daily`, `spending_limit_monthly`.

4. **`src/app/(tabs)/profile.tsx`**
   - Load profile from backend; show self-exclusion and limits status.

---

## Phase 3: Payment Webhook & Idempotency

**Duration:** 3–4 days  
**Goal:** RevenueCat webhook credits wallet; idempotent deposits.

---

### Step 3.1: Idempotency for Deposits

**Backend**

1. **Migration `004_idempotency.sql`**
   ```sql
   CREATE TABLE IF NOT EXISTS idempotency_keys (
     key VARCHAR(64) PRIMARY KEY,
     user_id UUID NOT NULL,
     endpoint VARCHAR(100) NOT NULL,
     response_status INT,
     response_body JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX idx_idempotency_user ON idempotency_keys(user_id);
   ```

2. **Middleware `backend/src/middleware/idempotency.js`**
   - Read `X-Idempotency-Key` header.
   - If key exists for user+endpoint, return stored response (same status + body).
   - Otherwise, run route, store response, return it.

3. **Apply to `POST /api/wallet/deposit`**
   - Use idempotency middleware so duplicate webhook calls don’t double-credit.

---

### Step 3.2: RevenueCat Webhook Endpoint

**Backend**

1. **`POST /api/webhooks/revenuecat`**
   - Verify webhook signature (RevenueCat docs).
   - Parse event: `INITIAL_PURCHASE`, `RENEWAL`, etc.
   - Extract `user_id` (app_user_id) and `amount`.
   - Use `referenceId` or `transaction_id` as idempotency key.
   - Call internal deposit logic (or shared function) with idempotency.
   - Return 200 quickly.

2. **Environment**
   - Add `REVENUECAT_WEBHOOK_SECRET` (or equivalent) to `backend/.env`.

---

### Step 3.3: Frontend Add-Funds Flow

**Frontend**

1. **`src/app/add-funds.tsx`**
   - Use RevenueCat SDK to start purchase.
   - On success, refetch wallet (webhook will have credited).
   - Or poll wallet a few times if webhook is async.
   - Show loading until balance updates.

2. **`src/lib/revenuecatClient.ts`**
   - Ensure `app_user_id` matches backend `user.id` (UUID) for webhook lookup.

---

## Phase 4: Lobby / Private Rooms (Model A)

**Duration:** 1–2 weeks  
**Goal:** Create room, join by code, host-seeded pot, instant draw.

---

### Step 4.1: Database Schema for Rooms

**Backend**

1. **Migration `005_lobby_model_a.sql`**
   - Add to `lobbies` (if missing):
     ```sql
     ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS code VARCHAR(8) UNIQUE;
     ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS prize_pool DECIMAL(12,2) DEFAULT 0;
     ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES users(id);
     ```
   - Add `lobby_tickets` (or extend existing) for room-specific tickets.
   - Ensure `lobby_members` has `has_ticket`, `ticket_position`, `ticket_hash` if used.

2. **Match schema to doc**
   - Room has: `code`, `prize_pool`, `host_user_id`, `status`, `max_participants`, etc.
   - Model A: host seeds `prize_pool`; members join free; host triggers draw.

---

### Step 4.2: Backend Lobby Routes

**Backend**

1. **`backend/src/routes/lobby.js`**
   - `POST /api/lobby/create` – create room, generate `code`, set host, seed pot (optional).
   - `POST /api/lobby/join` – body: `{ code }`; add user to `lobby_members`.
   - `POST /api/lobby/leave` – remove from `lobby_members`.
   - `GET /api/lobby/:id` – room details (members, pot, status).
   - `POST /api/lobby/:id/seed` – host seeds prize pool (deduct from host wallet).
   - `POST /api/lobby/:id/draw` – host triggers draw (min participants, cooldown checks).
   - `POST /api/lobby/:id/purchase-ticket` – if you add room tickets (Model A may be host-seeded only; clarify).

2. **Instant draw rules**
   - Only host can trigger.
   - Min participants (e.g. 2).
   - Min pot > 0.
   - Cooldown (e.g. 60s) between draws.
   - Lock room on trigger; winner gets 99%, 1% admin fee.

3. **WebSocket**
   - Emit `lobby:update` when pot changes or draw completes.
   - Room-scoped channel.

---

### Step 4.3: Frontend Lobby Integration

**Frontend**

1. **`BackendLobbyService` in `backend.ts`**
   - `createRoom(name, maxParticipants)`
   - `joinRoom(code)`
   - `leaveRoom(roomId)`
   - `getRoom(roomId)`
   - `seedPot(roomId, amount)`
   - `triggerDraw(roomId)`

2. **`src/lib/hooks/useRooms.ts`**
   - Switch from mock to `BackendLobbyService`.

3. **`src/app/create-room.tsx`**
   - Call create; show invite code; navigate to room.

4. **`src/app/join-room.tsx`**
   - Call join with code; navigate to room.

5. **`src/app/room/[id].tsx`**
   - Load room from API; show members, pot, “Seed pot” (host), “Start draw” (host).
   - Subscribe to `lobby:update` for live updates.

---

## Phase 5: Draw Automation & Cron

**Duration:** 2–3 days  
**Goal:** Automated midnight UTC settlement.

---

### Step 5.1: Cron Scheduler

**Backend**

1. **`backend/src/jobs/drawScheduler.js`**
   - Use `node-cron` (or similar): `0 0 * * *` (midnight UTC).
   - Call internal logic: execute today’s draw, create next day’s draw.
   - Or call `POST /api/draws/execute` and `POST /api/draws/create-next` with cron secret header.

2. **Security**
   - Require `X-Cron-Secret` or API key for cron endpoints.
   - Or run as separate process that uses DB directly (more complex).

3. **Startup**
   - In `backend/src/index.js`, require and start scheduler after server listen.

---

### Step 5.2: Frontend (Optional)

- No direct UI; users see results when draw completes.
- Ensure Home and Draw History refetch after draw (or via WebSocket `draw:result`).

---

## Phase 6: Rate Limiting & Security Hardening

**Duration:** 2–3 days  
**Goal:** Rate limits and basic security.

---

### Step 6.1: Rate Limiting

**Backend**

1. **`npm install express-rate-limit`**
2. **Middleware**
   - Auth: 5 req/min per IP for `/api/auth/signin`, `/api/auth/signup`.
   - Purchase: 10 req/min per user for `/api/tickets/purchase`.
   - Deposit: 5 req/min per user.
   - Withdraw: 3 req/min per user.
3. **Apply** in `index.js` before routes.

---

### Step 6.2: Additional Hardening

- Ensure `helmet` is applied.
- Validate all inputs (you already use express-validator).
- Use strong `JWT_SECRET`, `REFRESH_TOKEN_SECRET` in production.
- HTTPS in production; restrict CORS origins.

---

## Phase 7: Frontend–Backend Integration Checklist

**Duration:** Ongoing across phases  
**Goal:** All screens use real backend.

---

### Screens to Integrate

| Screen | Backend Source | Status |
|--------|----------------|--------|
| Sign In | `BackendAuthService.signIn` | ✅ Done |
| Sign Up | `BackendAuthService.signUp` | ✅ Done |
| Home (draw, buy ticket) | `BackendLotteryService` | Partially |
| Wallet / Add Funds | `BackendWalletService` | Partially |
| Withdraw | `BackendWalletService.withdraw` | Partially |
| My Tickets | `BackendLotteryService.getTickets` | Partially |
| Ticket Details | `BackendLotteryService` or new endpoint | Check |
| Draw History | `BackendLotteryService.getDrawHistory` | Check |
| Create Room | `BackendLobbyService` | ❌ |
| Join Room | `BackendLobbyService` | ❌ |
| Room [id] | `BackendLobbyService` | ❌ |
| Profile | `BackendUserService.getProfile` | ❌ |
| Self-Exclusion | `BackendUserService` | ❌ |
| Spending Limits | `BackendUserService` | ❌ |
| Forgot Password | New endpoint | ❌ |

### Hooks to Update

- `useAuth` → BackendAuthService ✅
- `useLottery` → BackendLotteryService
- `useUser` → BackendUserService / BackendWalletService
- `useRooms` → BackendLobbyService

---

## Phase 8: Password Reset

**Duration:** 1–2 days  

**Backend**

- `POST /api/auth/forgot-password` – create `password_reset_tokens` row, send email (or return token for dev).
- `POST /api/auth/reset-password` – validate token, update password.

**Frontend**

- `forgot-password.tsx` – call forgot-password API.
- Add reset-password screen (link with token).

---

## Summary Timeline

| Phase | Focus | Duration |
|-------|-------|----------|
| 0 | Prerequisites | 1 day |
| 1 | 1% fee, 1 ticket limit, WebSocket | 2–3 days |
| 2 | Responsible play | 3–4 days |
| 3 | Webhook + idempotency | 3–4 days |
| 4 | Lobby/Rooms | 1–2 weeks |
| 5 | Draw automation | 2–3 days |
| 6 | Rate limiting & hardening | 2–3 days |
| 7 | Frontend integration (parallel) | Ongoing |
| 8 | Password reset | 1–2 days |

**Total:** ~5–6 weeks

---

## Testing Strategy

- **Backend:** Integration script (`test-integration.ps1` or similar) for each new endpoint.
- **Frontend:** Manual test of each flow; optional E2E with Detox/Playwright.
- **Critical paths:** Sign up → Deposit → Buy ticket → Draw execution → Winner paid; Create room → Join → Seed → Draw.

---

## Deployment Considerations

- Backend: Render, Railway, or similar.
- DB: Managed PostgreSQL (e.g. Supabase, Neon).
- Frontend: EAS Build for iOS/Android; Web to Vercel/Netlify.
- Environment: Separate `.env` for dev/staging/prod.
- Webhook URL: Public HTTPS URL for RevenueCat.

---

*Last updated: February 3, 2026*
