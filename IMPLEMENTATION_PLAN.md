# Daily Dollar Draw — Full Implementation Plan

**Version:** 1.0  
**Last Updated:** February 3, 2026  
**Status:** ✅ Backend Implementation Complete

---

## Executive Summary

This document outlines the step-by-step implementation plan to transform Daily Dollar Draw from a mock-backed mobile app into a **production-ready, real-time, secure financial lottery platform**. The plan addresses:

- **Real-time prize pot** updates via WebSockets
- **Secure digital wallet** with atomic transactions
- **Cryptographic ticket vault** (server-side SHA-256 sealing)
- **Authentication & authorization**
- **Payment services** (RevenueCat + payouts)
- **Email services**
- **Secure lobby** system

---

## Part 1: Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP (React Native / Expo)                  │
│  • Existing UI (5 tabs)  • React Query  • Zustand  • RevenueCat SDK         │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │   REST API   │    │  WebSocket   │    │  RevenueCat  │
            │   (Node.js)  │    │   Server     │    │   (IAP)      │
            └──────────────┘    └──────────────┘    └──────────────┘
                    │                   │
                    └───────────────────┼───────────────────┘
                                        │
                                        ▼
            ┌──────────────────────────────────────────────────────────────┐
            │                    PostgreSQL Database                       │
            │  Users | Draws | Tickets | Wallets | Transactions | Lobbies  │
            └──────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Database** | PostgreSQL 15+ | Relational data, ACID transactions |
| **Backend** | Node.js 20+ (Express or Fastify) | REST API, server logic |
| **Real-time** | Socket.io or Supabase Realtime | Live prize pot, draw updates |
| **Auth** | JWT + bcrypt (or Supabase Auth) | Session management |
| **Payments (in)** | RevenueCat | In-app purchases (wallet top-up) |
| **Payments (out)** | Stripe Connect or PayPal Payouts | Withdrawals |
| **Email** | Resend, SendGrid, or Postmark | Transactional emails |
| **Hosting** | Supabase / Railway / Render / AWS | Cloud deployment |

---

## Part 2: Database Schema

> **Implementation status:** ✅ COMPLETED
> Database schema is implemented in `database/` folder.
> Run `psql -U postgres -d dailydollar -f database/init-all.sql` to set up.
> See `database/README.md` for full instructions.

### 2.1 Core Tables

#### **users**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| username | VARCHAR(50) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| email_verified | BOOLEAN | DEFAULT false |
| is_active | BOOLEAN | DEFAULT true |

#### **draws**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| draw_date | DATE | UNIQUE, NOT NULL |
| prize_pool | DECIMAL(12,2) | DEFAULT 0 |
| total_entries | INTEGER | DEFAULT 0 |
| commitment_hash | VARCHAR(64) | NOT NULL |
| seed | VARCHAR(64) | NULL (revealed after draw) |
| status | VARCHAR(20) | 'open', 'locked', 'drawn' |
| winning_position | INTEGER | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| drawn_at | TIMESTAMPTZ | NULL |

#### **tickets**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| ticket_id | VARCHAR(32) | UNIQUE (e.g. DDL-YYYYMMDD-XXXXX) |
| draw_id | UUID | FK → draws |
| user_id | UUID | FK → users |
| position | INTEGER | NOT NULL |
| total_entries_at_purchase | INTEGER | NOT NULL |
| **ticket_hash** | VARCHAR(64) | NOT NULL (SHA-256 seal) |
| status | VARCHAR(20) | 'active', 'won', 'lost' |
| prize_amount | DECIMAL(12,2) | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### **wallets**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users, UNIQUE |
| balance | DECIMAL(12,2) | DEFAULT 0, CHECK (balance >= 0) |
| pending_withdrawal | DECIMAL(12,2) | DEFAULT 0 |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### **transactions**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | FK → users |
| type | VARCHAR(20) | 'deposit', 'withdrawal', 'ticket_purchase', 'prize_win' |
| amount | DECIMAL(12,2) | NOT NULL |
| balance_after | DECIMAL(12,2) | NULL |
| status | VARCHAR(20) | 'pending', 'completed', 'failed' |
| reference_id | VARCHAR(100) | NULL (ticket_id, payout_id, etc.) |
| metadata | JSONB | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### **lobbies** (rooms)
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| code | VARCHAR(10) | UNIQUE |
| name | VARCHAR(100) | NOT NULL |
| host_id | UUID | FK → users |
| status | VARCHAR(20) | 'waiting', 'open', 'locked', 'drawn' |
| prize_pool | DECIMAL(12,2) | DEFAULT 0 |
| max_participants | INTEGER | DEFAULT 50 |
| draw_seed | VARCHAR(64) | NULL |
| winner_id | UUID | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### **lobby_members**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| lobby_id | UUID | FK → lobbies |
| user_id | UUID | FK → users |
| has_ticket | BOOLEAN | DEFAULT false |
| ticket_position | INTEGER | NULL |
| ticket_hash | VARCHAR(64) | NULL |
| joined_at | TIMESTAMPTZ | DEFAULT now() |

---

## Part 3: Security & Cryptographic Design

### 3.1 Ticket Hash (Cryptographic Seal)

**Requirement:** Server concatenates ticket data + secret server key → SHA-256 hash. Proves ticket hasn’t been altered.

**Server-side logic (Node.js):**

```javascript
const crypto = require('crypto');

function generateTicketHash(ticketId, drawId, userId, position, purchasedAt, secretKey) {
  const payload = `${ticketId}|${drawId}|${userId}|${position}|${purchasedAt}|${secretKey}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
```

- `secretKey` stored in server env (e.g. `TICKET_SEAL_SECRET`)
- Never exposed to client
- Verification: recompute hash on server and compare to stored `ticket_hash`

### 3.2 Atomic Operations (Wallet + Ticket)

**Requirement:** Ticket issued only if balance deducted in same transaction. No double-spending.

**PostgreSQL transaction pattern:**

```sql
BEGIN;
  -- 1. Lock user wallet row
  SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE;

  -- 2. Check sufficient balance
  IF balance < 1.00 THEN ROLLBACK; END IF;

  -- 3. Deduct wallet
  UPDATE wallets SET balance = balance - 1.00 WHERE user_id = $1;

  -- 4. Insert ticket with server-generated hash
  INSERT INTO tickets (...) VALUES (...);

  -- 5. Insert transaction record
  INSERT INTO transactions (user_id, type, amount, ...) VALUES ($1, 'ticket_purchase', -1.00, ...);

  -- 6. Update draw prize_pool and total_entries
  UPDATE draws SET prize_pool = prize_pool + 0.95, total_entries = total_entries + 1 WHERE id = $2;
COMMIT;
```

Use database transactions for all wallet operations. Do not rely on application-level locks.

---

## Part 4: Real-Time (Live Prize Pot)

### 4.1 WebSocket Events

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `draw:update` | Server → Client | `{ drawId, prizePool, totalEntries }` | Ticket purchased, draw updated |
| `draw:status` | Server → Client | `{ drawId, status }` | Draw locked/drawn |
| `lobby:update` | Server → Client | `{ roomId, prizePool, participants }` | Lobby ticket purchased |
| `connect` | Client → Server | - | Client connects |

### 4.2 Implementation Options

**Option A: Socket.io (self-hosted)**  
- Run Socket.io server alongside REST API  
- Emit `draw:update` after each successful ticket purchase

**Option B: Supabase Realtime**  
- Use `supabase.channel('draws')` and `postgres_changes`  
- DB triggers or API calls update `draws` table → Supabase pushes changes

**Option C: Pusher / Ably**  
- Third-party real-time service  
- Emit from backend after purchase

---

## Part 5: Implementation Phases (Step-by-Step)

---

### **Phase 0: Setup & Infrastructure**  
*Estimated: 3–5 days*

| Step | Task | Details |
|------|------|---------|
| 0.1 | Choose backend host | Supabase (DB + Auth + Realtime) or Railway/Render + PostgreSQL |
| 0.2 | Create PostgreSQL database | Provision instance, configure connection |
| 0.3 | Run migrations | Create tables from Part 2 schema |
| 0.4 | Set up backend repo | Node.js project (Express/Fastify), TypeScript |
| 0.5 | Environment variables | `DATABASE_URL`, `JWT_SECRET`, `TICKET_SEAL_SECRET`, etc. |

**Deliverable:** Database live, backend project scaffolded.

---

### **Phase 1: Authentication**  
*Estimated: 4–6 days*

| Step | Task | Details |
|------|------|---------|
| 1.1 | Implement sign-up | Hash password (bcrypt), insert user, create wallet |
| 1.2 | Implement sign-in | Verify password, issue JWT (access + refresh) |
| 1.3 | Implement token refresh | Refresh endpoint, rotate tokens |
| 1.4 | Implement sign-out | Invalidate refresh token (if stored) |
| 1.5 | Password reset | Generate reset token, send email, verify and set new password |
| 1.6 | Wire app to real auth | Replace `AuthService` mock with real API calls |

**Deliverable:** End-to-end auth (sign up, sign in, sign out, password reset).

---

### **Phase 2: User & Wallet**  
*Estimated: 3–4 days*

| Step | Task | Details |
|------|------|---------|
| 2.1 | User profile API | GET/PATCH profile, include wallet balance |
| 2.2 | Wallet service | Read balance, ensure wallet row exists for new users |
| 2.3 | Transaction history API | GET `/transactions` with pagination |
| 2.4 | Wire app | `UserService`, `useUserProfile`, wallet display |

**Deliverable:** Profile and wallet balance shown in app.

---

### **Phase 3: Draws & Tickets (Atomic + Cryptographic)**  
*Estimated: 5–7 days*

| Step | Task | Details |
|------|------|---------|
| 3.1 | Create daily draw cron | Midnight UTC: create new draw with commitment hash |
| 3.2 | Current draw API | GET `/lottery/current-draw` |
| 3.3 | Purchase ticket (atomic) | Single DB transaction: lock wallet → deduct → insert ticket (with server hash) → update draw |
| 3.4 | Ticket hash generation | Implement `generateTicketHash()` with SHA-256 |
| 3.5 | Verify ticket API | GET `/tickets/:id/verify` — recompute hash, return verification result |
| 3.6 | Get user tickets | GET `/lottery/tickets` |
| 3.7 | Wire app | Replace mock purchase with real API, show verified tickets |

**Deliverable:** Atomic ticket purchase, cryptographic ticket seal, verification endpoint.

---

### **Phase 4: Real-Time Updates**  
*Estimated: 3–4 days*

| Step | Task | Details |
|------|------|---------|
| 4.1 | Set up WebSocket/Realtime | Socket.io or Supabase channel |
| 4.2 | Emit on ticket purchase | After commit: broadcast `draw:update` with new prizePool, totalEntries |
| 4.3 | App WebSocket client | Connect on Home/Tickets, subscribe to draw channel |
| 4.4 | Update UI on event | React Query invalidate or local state update on `draw:update` |

**Deliverable:** Prize pot and player count update in real time without refresh.

---

### **Phase 5: Payments (Add Funds & Withdraw)**  
*Estimated: 5–7 days*

| Step | Task | Details |
|------|------|---------|
| 5.1 | RevenueCat webhook | Receive purchase events, validate, credit wallet |
| 5.2 | Add funds API | Internal: `POST /wallet/deposit` (called by webhook) |
| 5.3 | Withdrawal API | Check balance, create payout (Stripe Connect or PayPal), deduct wallet atomically |
| 5.4 | Payout provider setup | Stripe Connect or PayPal Payouts, bank account linking |
| 5.5 | Wire app | Connect add-funds flow to RevenueCat, withdraw to real payouts |

**Deliverable:** Real deposits via IAP, real withdrawals to bank/payment method.

---

### **Phase 6: Lobby (Secure Rooms)**  
*Estimated: 4–5 days*

| Step | Task | Details |
|------|------|---------|
| 6.1 | Create room API | Generate unique code, insert lobby + host as member |
| 6.2 | Join room API | Validate code, insert member |
| 6.3 | Purchase lobby ticket | Atomic: deduct wallet, add lobby ticket with hash |
| 6.4 | Start draw (host) | Lock room, set draw time |
| 6.5 | Execute draw | Select winner, credit prize to winner wallet atomically |
| 6.6 | Real-time lobby updates | Emit `lobby:update` on ticket purchase / draw |

**Deliverable:** Secure lobby with atomic ticket purchase and prize payout.

---

### **Phase 7: Email Services**  
*Estimated: 2–3 days*

| Step | Task | Details |
|------|------|---------|
| 7.1 | Email provider | Resend, SendGrid, or Postmark |
| 7.2 | Welcome email | On sign-up |
| 7.3 | Ticket confirmation | On purchase |
| 7.4 | Winner notification | On draw completion |
| 7.5 | Withdrawal confirmation | On payout initiated |
| 7.6 | Password reset | Send reset link |

**Deliverable:** All transactional emails sent from backend.

---

### **Phase 8: Draw Execution & Provably Fair**  
*Estimated: 3–4 days*

| Step | Task | Details |
|------|------|---------|
| 8.1 | Draw closure cron | At midnight UTC: lock draw, stop sales |
| 8.2 | Reveal seed | Store seed in DB, make public |
| 8.3 | Winner selection | `winningPosition = hash(seed) % totalEntries + 1` |
| 8.4 | Prize distribution | Atomic: credit winner wallet, update ticket status |
| 8.5 | Verification page/API | Public verification of commitment + winner |

**Deliverable:** Automated draws, provably fair winner selection, full verification.

---

### **Phase 9: Production Hardening**  
*Estimated: 4–6 days*

| Step | Task | Details |
|------|------|---------|
| 9.1 | Rate limiting | Per-IP and per-user limits |
| 9.2 | Input validation | Zod/Joi on all endpoints |
| 9.3 | Error monitoring | Sentry or similar |
| 9.4 | Logging | Structured logs (Winston/Pino) |
| 9.5 | HTTPS, CORS | Enforce HTTPS, restrict CORS |
| 9.6 | Geo-verification | Block restricted jurisdictions (if required) |
| 9.7 | KYC placeholder | Prepare for future ID verification |

**Deliverable:** Production-ready, monitored, and secure backend.

---

## Part 6: API Endpoint Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/sign-up` | Register |
| POST | `/auth/sign-in` | Login |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/sign-out` | Logout |
| POST | `/auth/reset-password` | Request reset |
| POST | `/auth/reset-password/confirm` | Set new password with token |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/profile` | Get profile + wallet |
| PATCH | `/user/profile` | Update profile |

### Lottery
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lottery/current-draw` | Current draw |
| POST | `/lottery/purchase-ticket` | Purchase (atomic) |
| GET | `/lottery/tickets` | User tickets |
| GET | `/lottery/tickets/:id/verify` | Verify ticket hash |
| GET | `/lottery/draw-history` | Past draws |
| GET | `/lottery/last-winner` | Last winner |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/wallet/deposit` | Add funds (webhook/internal) |
| POST | `/wallet/withdraw` | Request withdrawal |
| GET | `/wallet/transactions` | Transaction history |

### Lobby
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms` | List user's rooms |
| POST | `/rooms` | Create room |
| GET | `/rooms/:id` | Room details |
| POST | `/rooms/:id/join` | Join by code |
| POST | `/rooms/:id/purchase-ticket` | Buy room ticket |
| POST | `/rooms/:id/start-draw` | Host starts draw |
| POST | `/rooms/:id/execute-draw` | Run draw |

---

## Part 7: App Integration Checklist

### Client Changes Required

| Area | Change |
|------|--------|
| **config.ts** | Point `API_BASE_URL` to production backend |
| **client.ts** | Ensure `/auth/refresh` used for token refresh |
| **AuthService** | Replace mock with real auth API |
| **LotteryService** | Use real endpoints, handle WebSocket for live updates |
| **UserService** | Use real profile + wallet endpoints |
| **TransactionService** | Use real transactions API |
| **RoomsService** | Use real lobby endpoints |
| **WebSocket** | Add Socket.io client or Supabase Realtime subscription |
| **RevenueCat** | Configure webhook URL for server |

---

## Part 8: Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Setup | 3–5 days | 5 days |
| Phase 1: Auth | 4–6 days | 11 days |
| Phase 2: User & Wallet | 3–4 days | 15 days |
| Phase 3: Draws & Tickets | 5–7 days | 22 days |
| Phase 4: Real-time | 3–4 days | 26 days |
| Phase 5: Payments | 5–7 days | 33 days |
| Phase 6: Lobby | 4–5 days | 38 days |
| Phase 7: Email | 2–3 days | 41 days |
| Phase 8: Draw Execution | 3–4 days | 45 days |
| Phase 9: Production | 4–6 days | 51 days |

**Total estimated:** 10–11 weeks (1 developer, full-time).

---

## Part 9: Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Double-spend | Strict DB transactions, row-level locking |
| Ticket tampering | Server-only hash, never trust client hash |
| Race conditions | `SELECT ... FOR UPDATE` on wallet |
| Payment fraud | Webhook signature validation, idempotency |
| Draw manipulation | Commitment hash published before sales |
| Data loss | Daily DB backups, point-in-time recovery |

---

## Next Steps

1. Review and approve this plan.
2. Select backend host (Supabase vs. self-hosted).
3. Create repository and run Phase 0.
4. Proceed with Phase 1 (Authentication) as first development sprint.

---

*Document maintained in project root. Update as implementation progresses.*
