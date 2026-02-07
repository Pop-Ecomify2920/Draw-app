# 📱 Frontend-Backend Integration Guide

## ✅ **Integration Complete!**

The Daily Dollar Lotto mobile app is now connected to the Node.js backend!

---

## 🔗 **What Was Changed**

### 1. Environment Variables (`.env`)
```env
# OLD (Xano backend)
EXPO_PUBLIC_API_URL=https://x8ki-letl-twmt.n7.xano.io/api:ibCq7NKa

# NEW (Node.js backend)
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### 2. API Configuration (`src/lib/api/config.ts`)
- ✅ Updated endpoints to match Express.js backend
- ✅ Added authentication endpoints
- ✅ Updated draw/ticket/wallet endpoints

**New Endpoints:**
```typescript
AUTH: {
  SIGNUP: '/auth/signup',
  SIGNIN: '/auth/signin',
  REFRESH: '/auth/refresh',
  SIGNOUT: '/auth/signout',
}

DRAWS: {
  TODAY: '/draws/today',
  LIST: '/draws',
  GET: (id) => `/draws/${id}`,
}

TICKETS: {
  PURCHASE: '/tickets/purchase',
  MY_TICKETS: '/tickets/my-tickets',
  GET: (id) => `/tickets/${id}`,
}

WALLET: {
  GET: '/wallet',
  TRANSACTIONS: '/wallet/transactions',
  DEPOSIT: '/wallet/deposit',
  WITHDRAW: '/wallet/withdraw',
}
```

### 3. HTTP Client (`src/lib/api/client.ts`)
- ✅ Updated `refreshAccessToken()` to call backend `/auth/refresh`
- ✅ Proper JWT token handling (15-minute expiry)
- ✅ Automatic token refresh on 401 errors

### 4. Backend API Service (`src/lib/api/backend.ts`) **[NEW FILE]**
Created comprehensive service layer for backend integration:
- **BackendAuthService**: Sign in, sign up, sign out
- **BackendLotteryService**: Get draw, purchase ticket, ticket history
- **BackendWalletService**: Balance, transactions, deposit, withdraw

### 5. Main API Export (`src/lib/api/index.ts`)
- ✅ Exports new backend services
- ✅ Maintains backward compatibility with old Xano services

---

## 🎯 **How to Use the Backend API**

### Authentication Example

```typescript
import { BackendAuthService } from '@/lib/api';

// Sign Up
const signUpResult = await BackendAuthService.signUp(
  'user@example.com',
  'myusername',
  'password123'
);

if (signUpResult.success) {
  const { user, tokens } = signUpResult.data;
  console.log('User:', user);
  // Tokens are automatically stored
}

// Sign In
const signInResult = await BackendAuthService.signIn(
  'user@example.com',
  'password123'
);

if (signInResult.success) {
  const { user, tokens } = signInResult.data;
  // User is now authenticated
}

// Sign Out
await BackendAuthService.signOut();
```

### Get Today's Draw

```typescript
import { BackendLotteryService } from '@/lib/api';

const drawResult = await BackendLotteryService.getCurrentDraw();

if (drawResult.success) {
  const draw = drawResult.data;
  console.log('Draw ID:', draw.drawId);
  console.log('Prize Pool: $', draw.prizePool);
  console.log('Total Entries:', draw.totalEntries);
  console.log('Status:', draw.status); // 'open' | 'locked' | 'drawn'
}
```

### Purchase Ticket

```typescript
import { BackendLotteryService } from '@/lib/api';

// Get current draw first
const drawResult = await BackendLotteryService.getCurrentDraw();

if (drawResult.success) {
  // Purchase ticket for this draw
  const purchaseResult = await BackendLotteryService.purchaseTicket(
    drawResult.data.drawId
  );

  if (purchaseResult.success) {
    const { ticket, newBalance, prizePool, totalEntries } = purchaseResult.data;
    console.log('Ticket purchased!');
    console.log('Ticket ID:', ticket.id);
    console.log('Position:', ticket.position);
    console.log('Seal:', ticket.ticketHash); // Cryptographic hash
    console.log('New Balance: $', newBalance);
    console.log('Updated Prize Pool: $', prizePool);
  }
}
```

### Get Wallet & Transactions

```typescript
import { BackendWalletService } from '@/lib/api';

// Get wallet balance
const walletResult = await BackendWalletService.getWallet();

if (walletResult.success) {
  const wallet = walletResult.data;
  console.log('Balance: $', wallet.balance);
  console.log('Pending: $', wallet.pending_balance);
}

// Get transaction history
const txResult = await BackendWalletService.getTransactions(20, 0);

if (txResult.success) {
  const { transactions, pagination } = txResult.data;
  console.log('Total transactions:', pagination.total);
  transactions.forEach(tx => {
    console.log(`${tx.type}: $${tx.amount} - ${tx.status}`);
  });
}

// Deposit funds
const depositResult = await BackendWalletService.deposit(25.00, 'manual');

if (depositResult.success) {
  console.log('New Balance: $', depositResult.data.balance);
}
```

### Get My Tickets

```typescript
import { BackendLotteryService } from '@/lib/api';

const ticketsResult = await BackendLotteryService.getTickets();

if (ticketsResult.success) {
  const tickets = ticketsResult.data;
  console.log(`You have ${tickets.length} tickets`);
  
  tickets.forEach(ticket => {
    console.log('Ticket ID:', ticket.id);
    console.log('Draw Date:', ticket.drawDate);
    console.log('Position:', ticket.position);
    console.log('Status:', ticket.status); // 'active' | 'won' | 'lost'
    console.log('Hash:', ticket.ticketHash);
  });
}
```

---

## 🔄 **Token Management (Automatic)**

The app automatically handles JWT tokens:

- **Access Token**: 15-minute expiry
- **Refresh Token**: 7-day expiry (stored in AsyncStorage)
- **Auto-Refresh**: Tokens are automatically refreshed when expired
- **401 Handling**: Automatically tries to refresh on 401 errors

You don't need to manually manage tokens! The client does it for you.

---

## 🛠️ **Testing the Integration**

### Option 1: Use Expo Go (if no native modules)

```bash
# Make sure backend is running
cd backend
npm run dev

# In another terminal, start the mobile app
npm start

# Scan QR code with Expo Go app
```

### Option 2: Use Dev Build (with expo-dev-client)

```bash
# Android
npm run android

# iOS
npm run ios
```

### Option 3: Test on Web

```bash
npm run web
```

Visit `http://localhost:8082`

---

## 📝 **Migration Checklist**

If you're updating existing screens to use the backend:

- [ ] Replace `AuthService` with `BackendAuthService`
- [ ] Replace `LotteryService` with `BackendLotteryService`
- [ ] Replace `UserService.getProfile()` with backend user data
- [ ] Replace `TransactionService` with `BackendWalletService`
- [ ] Update Zustand stores to use backend response types
- [ ] Test authentication flow
- [ ] Test ticket purchase flow
- [ ] Test wallet operations

---

## 🎨 **Example: Update Sign In Screen**

**Before (Mock/Xano):**
```typescript
import { AuthService } from '@/lib/api';

const handleSignIn = async () => {
  const result = await AuthService.signIn({ email, password });
  // ...
};
```

**After (Backend):**
```typescript
import { BackendAuthService } from '@/lib/api';

const handleSignIn = async () => {
  const result = await BackendAuthService.signIn(email, password);
  // ...
};
```

---

## 🔐 **Security Notes**

1. **HTTPS in Production**: Change `API_BASE_URL` to `https://your-backend.com/api`
2. **Secure Storage**: Tokens are stored in AsyncStorage (secure on device)
3. **Token Expiry**: Access tokens expire after 15 minutes
4. **Automatic Logout**: If refresh token is invalid, user is logged out
5. **Cryptographic Seals**: Tickets have SHA-256 hashes to prevent tampering

---

## 🚀 **Deployment Checklist**

When deploying to production:

### Backend
- [ ] Deploy backend to Render/Railway/Heroku
- [ ] Set up managed PostgreSQL database
- [ ] Update `JWT_SECRET` and other secrets
- [ ] Enable CORS for your mobile app domain
- [ ] Set up SSL/HTTPS

### Mobile App
- [ ] Update `.env` with production `EXPO_PUBLIC_API_URL`
- [ ] Build production app: `eas build --platform all`
- [ ] Test with production backend
- [ ] Submit to app stores

---

## 🧪 **Testing Endpoints Manually**

You can test the backend directly from the terminal:

```powershell
# Sign Up
curl -Method POST -Uri "http://localhost:3000/api/auth/signup" `
  -Headers @{"Content-Type"="application/json"} `
  -Body (@{email="test@example.com"; username="testuser"; password="password123"} | ConvertTo-Json)

# Sign In
curl -Method POST -Uri "http://localhost:3000/api/auth/signin" `
  -Headers @{"Content-Type"="application/json"} `
  -Body (@{email="test@example.com"; password="password123"} | ConvertTo-Json)

# Get Today's Draw (no auth required)
curl http://localhost:3000/api/draws/today

# Get Wallet (requires auth)
$token = "YOUR_ACCESS_TOKEN"
curl -Headers @{"Authorization"="Bearer $token"} http://localhost:3000/api/wallet
```

---

## 📊 **Response Examples**

### Sign In Response
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myusername",
    "created_at": "2026-02-03T...",
    "email_verified": false,
    "is_active": true
  },
  "tokens": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

### Get Draw Response
```json
{
  "draw": {
    "id": "uuid",
    "draw_date": "2026-02-03",
    "prize_pool": "125.00",
    "total_entries": 125,
    "commitment_hash": "abc123...",
    "status": "open"
  }
}
```

### Purchase Ticket Response
```json
{
  "ticket": {
    "id": "uuid",
    "ticket_id": "TKT1738590456789",
    "position": 42,
    "ticket_hash": "def456...",
    "status": "active"
  },
  "prizePool": 126.00,
  "totalEntries": 126,
  "newBalance": 24.00
}
```

---

## 🎉 **You're All Set!**

Your mobile app is now fully connected to the Node.js backend with:

✅ JWT Authentication  
✅ Automatic Token Refresh  
✅ Cryptographic Ticket Security  
✅ Wallet Management  
✅ Real-time Draw Data  
✅ Transaction History  

Start building your screens with the new `BackendAPI` services!

---

**Need Help?**
- Backend API Docs: `backend/README.md`
- Full System Status: `SYSTEM_READY.md`
- Quick Start Guide: `QUICKSTART.md`
