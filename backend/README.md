# Daily Dollar Lotto - Backend Server

Secure, real-time backend API for the Daily Dollar Lotto mobile app.

## Features

- ✅ **Authentication**: JWT-based auth with refresh tokens
- ✅ **Cryptographic Security**: SHA-256 ticket sealing for tamper prevention
- ✅ **Atomic Transactions**: PostgreSQL transactions for financial operations
- ✅ **Real-time Updates**: WebSocket server for live prize pool updates
- ✅ **Wallet System**: Deposits, withdrawals, and transaction history
- ✅ **Provably Fair Draws**: Commitment-reveal scheme for transparent winner selection
- ✅ **Structured Logging**: Winston logger for production monitoring

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **Real-time**: Socket.io
- **Authentication**: JWT + bcrypt
- **Logging**: Winston

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ installed and running
- Database schema initialized (see `/database` folder in project root)

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

**Edit `.env` with your configuration:**

```env
# Database (update with your PostgreSQL credentials)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dailydollar
DB_USER=postgres
DB_PASSWORD=your_password

# Security (IMPORTANT: Use strong secrets in production!)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_change_this
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key_change_this
TICKET_SEAL_SECRET=your_ticket_sealing_secret_key_min_32_chars_change_this

# Server
PORT=3000
NODE_ENV=development
```

### 3. Initialize Database

Make sure you've run the database migrations first (in project root):

```bash
cd ../database
psql -U postgres -d dailydollar -f init-all.sql
```

### 4. Start the Server

**Development mode (with auto-restart):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

Server will start at `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/signin` | Sign in user |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/signout` | Sign out user |

### Draws

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/draws/today` | Get today's active draw |
| GET | `/api/draws/:drawId` | Get specific draw details |
| GET | `/api/draws` | Get draw history |
| POST | `/api/draws/execute` | Execute draw (admin) |
| POST | `/api/draws/create-next` | Create next day's draw |

### Tickets

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/tickets/purchase` | Purchase a ticket | ✅ |
| GET | `/api/tickets/my-tickets` | Get user's tickets | ✅ |
| GET | `/api/tickets/:ticketId` | Get specific ticket | ✅ |

### Wallet

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/wallet` | Get wallet balance | ✅ |
| GET | `/api/wallet/transactions` | Get transaction history | ✅ |
| POST | `/api/wallet/deposit` | Add funds | ✅ |
| POST | `/api/wallet/withdraw` | Request withdrawal | ✅ |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

## WebSocket Events

### Client → Server

- `join:draw` - Join draw room for real-time updates
- `leave:draw` - Leave draw room

### Server → Client

- `draw:update` - Prize pool updated
- `draw:result` - Draw completed, winner announced
- `notification` - Personal notification to user

## Example Requests

### 1. Register User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "securepassword123"
  }'
```

### 2. Get Today's Draw

```bash
curl http://localhost:3000/api/draws/today
```

### 3. Purchase Ticket (with auth)

```bash
curl -X POST http://localhost:3000/api/tickets/purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "drawId": "uuid-of-todays-draw"
  }'
```

## WebSocket Connection (Client Example)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Join today's draw room
socket.emit('join:draw', drawId);

// Listen for prize pool updates
socket.on('draw:update', (data) => {
  console.log('Prize pool:', data.prizePool);
  console.log('Total entries:', data.totalEntries);
});

// Listen for draw results
socket.on('draw:result', (result) => {
  console.log('Winner position:', result.winningPosition);
  console.log('Prize amount:', result.prizeAmount);
});
```

## Security Features

### 1. Cryptographic Ticket Sealing

Every ticket is sealed with a SHA-256 hash:

```
seal = SHA256(ticketId:userId:drawId:purchasedAt:SECRET)
```

This prevents tampering after purchase.

### 2. Provably Fair Draws

- **Commitment Phase**: Server generates random seed and publishes commitment hash before draw
- **Reveal Phase**: After draw closes, seed is revealed
- **Verification**: Anyone can verify the winner by hashing the seed and checking against commitment

### 3. Atomic Transactions

All financial operations use PostgreSQL transactions:

```javascript
await transaction(async (client) => {
  await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, walletId]);
  await client.query('INSERT INTO tickets (user_id, draw_id) VALUES ($1, $2)', [userId, drawId]);
  await client.query('UPDATE draws SET prize_pool = prize_pool + $1 WHERE id = $2', [amount, drawId]);
});
```

If any operation fails, all are rolled back.

## Logging

Logs are written to:
- Console (formatted with colors)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

## Production Deployment

### Environment Variables

**Critical variables for production:**

```env
NODE_ENV=production
JWT_SECRET=<64-char-random-string>
REFRESH_TOKEN_SECRET=<64-char-random-string>
TICKET_SEAL_SECRET=<64-char-random-string>
DATABASE_URL=postgresql://user:pass@host:5432/dbname
ALLOWED_ORIGINS=https://yourdomain.com
```

### Recommended Hosting

- **Render**: Easy Node.js + PostgreSQL deployment
- **Railway**: One-click PostgreSQL + Node.js
- **Heroku**: Classic PaaS with add-ons
- **AWS/GCP/Azure**: Full control, requires more setup

### Database Connection Pool

Configured for production:
- Max 20 connections
- 30s idle timeout
- 2s connection timeout

Adjust in `src/config/database.js` based on your hosting plan.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # PostgreSQL pool
│   │   └── logger.js         # Winston logger
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── validation.js     # Input validation
│   │   └── errorHandler.js   # Error handling
│   ├── routes/
│   │   ├── auth.js           # Auth endpoints
│   │   ├── tickets.js        # Ticket endpoints
│   │   ├── wallet.js         # Wallet endpoints
│   │   └── draws.js          # Draw endpoints
│   ├── utils/
│   │   └── crypto.js         # Cryptographic functions
│   ├── websocket/
│   │   └── index.js          # Socket.io server
│   └── index.js              # Main entry point
├── logs/                      # Log files
├── .env                       # Environment variables
├── package.json
└── README.md
```

## Testing

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","timestamp":"...","database":"connected"}
```

## Next Steps

1. ✅ Connect mobile app to backend (update API endpoints in `src/lib/api/config.ts`)
2. ⏳ Add payment webhooks (RevenueCat, Stripe)
3. ⏳ Add email service (Resend/SendGrid)
4. ⏳ Add admin dashboard
5. ⏳ Set up automated draw execution (cron job)
6. ⏳ Add rate limiting
7. ⏳ Add API documentation (Swagger/OpenAPI)

## Support

For issues or questions, check the main project documentation or contact the development team.

---

**Built with ❤️ for Daily Dollar Lotto**
