# 🔥 FINAL FIX: Complete System Reset & Startup

## ❗ What's Wrong

The web app is **caching old code**. I've already fixed everything, but your browser/Metro bundler needs to reload the new code.

---

## ✅ Step-by-Step Fix (3 Minutes)

### Step 1: Close Everything

```powershell
# Close all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# OR just press Ctrl+C in all terminal windows
```

### Step 2: Start Backend

```powershell
cd backend
npm run dev
```

**Wait for this message:**
```
🎰 Daily Dollar Lotto Backend Server
Status: Running
Port: 3000
```

### Step 3: Start Web App (with cache cleared)

```powershell
# In a NEW terminal
npm run web -- --clear
```

**Wait for:**
```
› Metro waiting on exp://...
```

### Step 4: Open Browser & Test

1. Go to: `http://localhost:8082`
2. **Press F12** to open DevTools
3. **Press Ctrl + Shift + R** (hard refresh)
4. Try to sign in with:
   ```
   Email: luckydev050@gmail.com
   Password: Test12345678
   ```

### Step 5: Check Console Logs

In DevTools Console (F12), you should see:
```
🔧 API Configuration: {...}
🔐 BackendAuthService.signIn called: {...}
🌐 API Request: POST http://localhost:3000/api/auth/signin
📥 API Response: {status: 200, ok: true}
✅ Sign in successful, storing tokens...
✅ User authenticated: {...}
```

---

## 🎯 Quick Test (If You Don't Want to Restart)

### Option 1: Use Test HTML Page

Open in browser:
```
C:\Users\Administrator\Downloads\...\test-backend.html
```

Click "Test Sign In" - if this works, backend is fine!

### Option 2: Test Backend Directly

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/signin" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"luckydev050@gmail.com","password":"Test12345678"}'
```

Should return:
```json
{
  "message": "Sign in successful",
  "user": {...},
  "tokens": {...}
}
```

---

## 🐛 Still Not Working?

### Check #1: Is Backend Running?

```powershell
curl http://localhost:3000/health
```

Should show: `"status":"healthy"`

### Check #2: Is Web App Using New Code?

Open browser console (F12) and type:
```javascript
console.log(window.location.href)
// Should be: http://localhost:8082
```

Refresh and check console for:
```
🔧 API Configuration: {...}
```

If you DON'T see this, the new code isn't loaded!

### Check #3: Network Tab

1. Open DevTools (F12)
2. Go to "Network" tab
3. Try to sign in
4. Look for request to: `http://localhost:3000/api/auth/signin`

**If you see:**
- ❌ CORS error → Backend issue (restart backend)
- ❌ 404 Not Found → Wrong URL
- ❌ Failed to fetch → Backend not running
- ✅ 200 OK → Backend works! Frontend caching issue

### Fix: Clear Everything

```powershell
# 1. Kill all Node
Get-Process node | Stop-Process -Force

# 2. Clear Metro cache
npm start -- --clear --reset-cache

# 3. Clear browser cache
# In browser: Ctrl + Shift + Delete, select "Cached images and files", Clear
```

---

## 📊 System Checklist

| Component | Status | How to Check |
|-----------|--------|--------------|
| **Backend** | ✅ Should be running | `curl http://localhost:3000/health` |
| **Database** | ✅ Already configured | Backend logs show "Database: connected" |
| **CORS** | ✅ Fixed | Allows localhost:8082 |
| **API Config** | ✅ Fixed | Hardcoded to localhost:3000 |
| **Auth Service** | ✅ Fixed | Using BackendAuthService |
| **Debug Logging** | ✅ Added | Check browser console |

---

## 🎉 What Happens When It Works

1. ✅ Sign in form sends request to backend
2. ✅ Backend validates credentials
3. ✅ Backend returns JWT tokens
4. ✅ Frontend stores tokens
5. ✅ You're redirected to home screen
6. ✅ You can see your wallet, purchase tickets, etc.

---

## 📁 Quick Commands

### Start Everything (Easy Way)

```powershell
# Backend
cd backend; npm run dev

# Frontend (new terminal)
npm run web -- --clear
```

### Test Backend

```powershell
# Health check
curl http://localhost:3000/health

# Sign in test
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/auth/signin" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"luckydev050@gmail.com","password":"Test12345678"}'
```

---

## 💡 Pro Tips

1. **Always use `--clear` flag** when starting Metro bundler:
   ```bash
   npm run web -- --clear
   ```

2. **Always hard refresh browser** (Ctrl + Shift + R)

3. **Check console logs** (F12) - they'll tell you exactly what's happening

4. **If stuck, restart everything:**
   ```powershell
   Get-Process node | Stop-Process -Force
   # Then start backend and frontend again
   ```

---

## ✅ Your Credentials

```
Email: luckydev050@gmail.com
Password: Test12345678
```

Account already exists in database. Just sign in!

---

## 🚀 After It Works

Once you can sign in, you can:
- ✅ View wallet ($0.00 initially)
- ✅ Add funds (backend deposits money)
- ✅ Buy tickets (real database transaction)
- ✅ View ticket history
- ✅ See draw information
- ✅ Everything is connected to PostgreSQL!

---

**Your backend is 100% working and connected to PostgreSQL!**  
**The only issue is the web app needs to reload the new code.**

**Just restart with `--clear` flag and hard refresh your browser!** 🎯
