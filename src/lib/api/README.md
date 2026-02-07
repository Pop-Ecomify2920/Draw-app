# API Services - Backend Integration

## 📁 Files Overview

### `config.ts`
- API base URL configuration
- Endpoint definitions
- Request timeout and retry settings
- Token storage keys

### `client.ts`
- HTTP client with automatic token management
- Token refresh logic
- Retry mechanism with exponential backoff
- Request/response interceptors

### `backend.ts` ⭐ **NEW**
- **BackendAuthService**: Authentication (sign in, sign up, sign out)
- **BackendLotteryService**: Draws and tickets
- **BackendWalletService**: Wallet balance and transactions
- Properly typed responses matching Node.js backend

### `mock.ts`
- Mock data for development/testing
- Used when `EXPO_PUBLIC_API_URL` is not set

### `index.ts`
- Main export file
- Legacy Xano services (kept for backward compatibility)
- **New**: Exports backend services

---

## 🚀 Quick Start

```typescript
import { BackendAPI } from '@/lib/api';

// Sign in
const result = await BackendAPI.Auth.signIn('user@example.com', 'password');

// Get today's draw
const draw = await BackendAPI.Lottery.getCurrentDraw();

// Purchase ticket
const purchase = await BackendAPI.Lottery.purchaseTicket(draw.data.drawId);

// Check wallet
const wallet = await BackendAPI.Wallet.getWallet();
```

---

## 🔐 Authentication Flow

1. User signs in/up → Tokens stored automatically
2. API calls include `Authorization: Bearer <token>`
3. If token expires → Auto-refresh using refresh token
4. If refresh fails → User logged out

---

## 📊 Response Format

All API calls return `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
```

**Always check `success` before accessing `data`:**

```typescript
const result = await BackendAPI.Lottery.getCurrentDraw();

if (result.success) {
  console.log('Draw:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

## 🛠️ Development

### Using Mock Data

If `EXPO_PUBLIC_API_URL` is empty, the app uses mock data:

```env
# .env
EXPO_PUBLIC_API_URL=  # Empty = mock mode
```

### Using Real Backend

```env
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000/api  # Real backend
```

---

## 🎯 Best Practices

1. **Always handle errors**: Check `result.success`
2. **Don't store tokens manually**: The client does it automatically
3. **Use TypeScript types**: Import types from `backend.ts`
4. **Test with mock data first**: Easier to develop UI
5. **Switch to backend**: When ready to test full flow

---

## 📚 See Also

- Full integration guide: `FRONTEND_BACKEND_INTEGRATION.md`
- Backend docs: `backend/README.md`
- System overview: `SYSTEM_READY.md`
