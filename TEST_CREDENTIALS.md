# 🔐 Test Credentials for Mobile App

## ✅ Fixed: App Now Uses Real Backend Authentication!

### What Was Fixed:
- Updated `src/lib/hooks/useAuth.ts` to use `BackendAuthService` instead of mock `AuthService`
- All sign in/sign up/sign out now connect to the real database
- No more accepting any random credentials!

---

## 🧪 Test Account

Use these credentials to sign in:

```
Email: test@dailydollar.com
Username: testuser
Password: test1234
```

Or create your own account using the Sign Up screen!

---

## ✅ How to Test

### 1. Make Sure Backend is Running
```powershell
cd backend
npm run dev
```

You should see:
```
🎰 Daily Dollar Lotto Backend Server
Status: Running
Port: 3000
Database: PostgreSQL
```

### 2. Start the Mobile App

**Web (Easiest):**
```bash
npm run web
```
Visit `http://localhost:8082`

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

### 3. Test Sign In

1. Open the app
2. Enter the test credentials:
   - Email: `test@dailydollar.com`
   - Password: `test1234`
3. Click "Sign In"

**✅ Expected:** You should successfully sign in!

**❌ If you use wrong credentials:** You'll get an error message (this is good - it means it's validating against the database!)

### 4. Test Sign Up

1. Click "Sign Up"
2. Enter new credentials:
   - Email: `your.email@example.com`
   - Username: `yourusername`
   - Password: `yourpassword`
3. Click "Sign Up"

**✅ Expected:** Account created in PostgreSQL database!

---

## 🔍 Verify in Database

You can check if users are being created:

```powershell
$env:PGPASSWORD='12345678'
psql -U postgres -d dailydollar -c "SELECT id, email, username, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
```

---

## 🐛 Troubleshooting

### "Sign in failed" error
- ✅ Backend is running on port 3000
- ✅ Database password is correct in `backend/.env`
- ✅ You're using the correct test credentials

### Network error
- Make sure `EXPO_PUBLIC_API_URL=http://localhost:3000/api` in `.env`
- Restart the app after changing `.env`

### TypeScript errors
- Run: `npm run typecheck` to see any type issues

---

## 📊 What Happens Now

When you sign in:

1. **App** sends email + password to → **Backend** (`POST /api/auth/signin`)
2. **Backend** checks PostgreSQL database for user
3. **Backend** verifies password with bcrypt
4. **Backend** generates JWT access + refresh tokens
5. **Backend** returns user info + tokens
6. **App** stores tokens securely (AsyncStorage)
7. **App** automatically includes token in all future API calls

**You're now using real authentication with a real database!** ✅

---

## 🎉 Next Steps

Now that authentication works, test other features:

- ✅ View wallet balance (should be $0 for new account)
- ✅ Deposit funds
- ✅ Purchase a ticket
- ✅ View transaction history

All these will now use the real backend API!

---

**Test Credentials:**
```
Email: test@dailydollar.com
Password: test1234
```
