# Gap Analysis: Doc vs Current Implementation

**Date:** February 3, 2026  
**Doc:** Daily Dollar Draw — Backend Implementation Plan  
**Codebase:** Current backend + frontend

---

## Executive Summary

| Area | Doc Requirement | Current Status | Gap |
|------|-----------------|----------------|-----|
| **Foundation** | Auth, Wallet, Ledger | ✅ Auth, Wallet, Transactions | Partial (see ledger) |
| **Tickets** | $1, max 1/user/draw, crypto | ✅ $1, crypto | ❌ No 1-per-user limit |
| **Draw Engine** | 1% fee, 99% to winner | ✅ Settlement works | ❌ No admin fee |
| **Realtime** | WebSocket push on purchase | ✅ Server ready | ❌ Not wired to ticket purchase |
| **Rooms** | Private rooms, host-seeded | ❌ No lobby routes | ❌ Not implemented |
| **Payments** | Webhook + idempotency | ✅ Manual deposit only | ❌ No webhook |
| **Responsible Play** | Self-exclusion, limits | ❌ Not in backend | ❌ Not implemented |

---

## 1. What Matches the Doc ✅

| Doc Requirement | Implementation | Location |
|-----------------|----------------|----------|
| User auth (signup, signin, JWT) | ✅ Full | `auth.js` |
| Wallet balance & transactions | ✅ Full | `wallet.js` |
| $1 ticket price | ✅ | `tickets.js` line 27 |
| Atomic ticket purchase | ✅ | `tickets.js` – single transaction |
| Cryptographic ticket sealing (SHA-256) | ✅ | `utils/crypto.js` + `tickets.js` |
| Min $10 withdrawal | ✅ | `wallet.js` line 149 |
| Deterministic winner selection | ✅ | `crypto.js` `determineWinner()` |
| Draw lock → seed reveal → winner | ✅ | `draws.js` `/execute` |
| Transaction recording | ✅ | All financial ops log to `transactions` |
| WebSocket server structure | ✅ | `websocket/index.js` |
| Data access control (user-scoped) | ✅ | JWT + `req.user.id` |

---

## 2. Gaps vs Doc ❌

### 2.1 1% Admin Fee

**Doc:** Winner gets 99%, admin keeps 1% at settlement.

**Current:** Winner receives 100% of prize pool.

```javascript
// draws.js - line 205-208: credits full prize_pool
await client.query(
  `UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`,
  [prizeAmount.rows[0].prize_pool, winner.user_id]
);
```

**Needed:**  
- Compute `winnerAmount = prizePool * 0.99`  
- Compute `adminFee = prizePool * 0.01`  
- Credit winner with `winnerAmount`  
- Credit admin wallet or record fee as separate transaction  
- Update ticket `prize_amount` to `winnerAmount`

---

### 2.2 Max 1 Ticket Per User Per Draw

**Doc:** Max 1 ticket per user per main draw per day.

**Current:** No limit; users can buy multiple tickets for the same draw.

**Needed:**  
- Before insert in `tickets.js`, check:

```sql
SELECT COUNT(*) FROM tickets 
WHERE user_id = $1 AND draw_id = $2
```

- If count ≥ 1, return error like "Max 1 ticket per draw"

---

### 2.3 Realtime Pot Updates

**Doc:** Server pushes pot updates immediately after each ticket purchase.

**Current:**  
- `broadcastPrizePoolUpdate()` exists in `websocket/index.js`  
- Not called from `tickets.js` after purchase (TODO comment)

**Needed:**  
- In `tickets.js` after successful purchase:

```javascript
import { broadcastPrizePoolUpdate } from '../websocket/index.js';
// After transaction commits:
broadcastPrizePoolUpdate(drawId, result.draw.prize_pool, result.draw.total_entries);
```

- Frontend subscribes to `draw:update` and updates UI

---

### 2.4 Lobby / Private Rooms

**Doc:** Room creation, invite codes, join flow, host-seeded pots (Model A).

**Current:** No lobby routes or room logic.

**Needed:**  
- Routes: create room, join by code, leave  
- Tables: `lobbies`, `lobby_members` (schema may exist)  
- Room-specific pot, draw, winner logic  
- Host triggers instant draw with rules (min participants, cooldown)

---

### 2.5 Ledger-Based Balances

**Doc:** Balances derived from ledger; no direct balance updates.

**Current:**  
- `wallets.balance` updated directly  
- `transactions` used as history

**Options:**  
- Keep current model (common and acceptable)  
- Or: remove `wallets.balance`, derive from `SUM(transactions)` (bigger refactor)

---

### 2.6 Payment Webhook & Idempotency

**Doc:**  
- Wallet credited only after payment confirmation (webhook)  
- Idempotency key prevents double-credit on retry

**Current:**  
- Deposit only via manual POST; no webhook  
- No idempotency key

**Needed:**  
- RevenueCat (or provider) webhook endpoint  
- Check `referenceId` / idempotency key before crediting  
- Dedicated endpoint or flag for webhook vs manual

---

### 2.7 Responsible Play

**Doc:** Self-exclusion and spending limits enforced server-side.

**Current:** No self-exclusion or spending limits in backend.

**Needed:**  
- `users` (or profile) fields: `self_excluded_until`, `spending_limit_daily`, `spending_limit_monthly`  
- Middleware or checks on: ticket purchase, deposit, withdraw, room funding  
- Block actions when self-excluded or over limit

---

### 2.8 Draw Automation (Midnight UTC)

**Doc:** Automated settlement at midnight UTC.

**Current:**  
- `POST /api/draws/execute` and `POST /api/draws/create-next` exist  
- No cron/scheduler

**Needed:**  
- Cron job or scheduler (e.g. node-cron, external cron)  
- Call execute for today, create-next for tomorrow  
- Add auth/API key for cron calls

---

### 2.9 Idempotency & Rate Limiting

**Doc:**  
- Idempotency on write operations  
- Rate limits on sensitive endpoints

**Current:** No idempotency keys or rate limiting.

**Needed:**  
- Idempotency: `X-Idempotency-Key` header, store and reject duplicates  
- Rate limiting: e.g. `express-rate-limit` on auth, deposit, purchase, withdraw

---

## 3. Milestone Alignment

| Milestone | Doc Scope | Status | Priority Fixes |
|-----------|-----------|--------|----------------|
| **M1** Foundation + Wallet | Auth, deposit webhook, ledger | ~70% | Webhook + idempotency |
| **M2** Tickets + Realtime | Purchase, crypto, live pot | ~80% | 1/user limit, wire WebSocket |
| **M3** Rooms + Draw Engine | Rooms, settlement, fee | ~40% | 1% fee, rooms, cron |
| **M4** Withdrawals + Hardening | Payouts, limits, prod | ~50% | Responsible play, rate limit |

---

## 4. Recommended Implementation Order

1. **Quick wins**
   - Add 1% admin fee to draw settlement
   - Enforce max 1 ticket per user per draw
   - Call `broadcastPrizePoolUpdate` after ticket purchase

2. **M2 completion**
   - Connect frontend to WebSocket and handle `draw:update`

3. **M1 completion**
   - RevenueCat (or provider) webhook
   - Idempotency on deposit

4. **M3**
   - Lobby/room routes and logic
   - Cron for midnight UTC settlement

5. **M4**
   - Responsible play checks
   - Rate limiting
   - Production hardening

---

## 5. Assumptions to Confirm

| # | Assumption | Doc Says | Confirm? |
|---|------------|----------|----------|
| 1 | 1% fee on every pot | Yes | ✓ |
| 2 | Max 1 ticket per user per main draw | Yes | ✓ |
| 3 | Min withdrawal $10 | Yes | ✓ Implemented |
| 4 | Room funding: Model A (host-seeded) | Yes | ✓ |
| 5 | $1 tickets main draw only | Yes | ✓ |

---

*Generated from codebase review — February 3, 2026*
