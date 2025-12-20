# Railway Variables Checklist - Required Environment Variables

## 🚨 CRITICAL: All These Variables Must Be Set in Railway

### Step 1: Go to Railway Dashboard
1. Open: **Railway Dashboard** → **ackit-iot** service (or your backend service name)
2. Click: **Variables** tab
3. Verify all variables below are present

---

## ✅ Required Variables

### 1. Database Variables (Auto-provided by Railway PostgreSQL)
- [ ] **`DATABASE_URL`** - Auto-provided by Railway when PostgreSQL service is connected
- [ ] **`DATABASE_PUBLIC_URL`** - For external access (copy from PostgreSQL service → Variables)

**How to get:**
1. Go to **PostgreSQL Service** → **Variables** tab
2. Copy `DATABASE_PUBLIC_URL` value
3. Go to **Backend Service** → **Variables** tab
4. Add `DATABASE_PUBLIC_URL` if not present

---

### 2. Application Environment
- [ ] **`NODE_ENV`** = `production`

**How to set:**
- Railway Dashboard → Backend Service → Variables
- Name: `NODE_ENV`
- Value: `production`

---

### 3. Security Secrets (REQUIRED)
- [ ] **`JWT_SECRET`** - Secret key for JWT tokens
- [ ] **`SESSION_SECRET`** - Secret key for session cookies

**How to generate:**
```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32
```

**How to set:**
1. Railway Dashboard → Backend Service → Variables
2. Click **+ New Variable**
3. Name: `JWT_SECRET`, Value: (generated secret)
4. Click **+ New Variable** again
5. Name: `SESSION_SECRET`, Value: (generated secret)

---

### 4. Email Configuration (If using email features)
- [ ] **`EMAIL_SERVICE`** - Email service provider (e.g., `gmail`, `outlook`)
- [ ] **`EMAIL_USER`** - Email address
- [ ] **`EMAIL_PASS`** - Email password or app password
- [ ] **`EMAIL_FROM`** - From email address
- [ ] **`EMAIL_NAME`** - From name
- [ ] **`EMAIL_PORT`** - Email port (usually `587` or `465`)
- [ ] **`EMAIL_SECURE`** - Use SSL/TLS (`true` or `false`)
- [ ] **`IOTIFY_NOTIFICATION_EMAIL`** - Notification email address

---

### 5. JWT Expiration (Optional - has defaults)
- [ ] **`JWT_EXPIRES_IN`** - JWT token expiration (default: `24h`)
- [ ] **`JWT_REFRESH_EXPIRES_IN`** - Refresh token expiration (default: `7d`)

---

## 🔍 How to Verify Variables

### Method 1: Railway Dashboard
1. Go to **Backend Service** → **Variables** tab
2. Check all variables listed above are present
3. Values should be masked (showing `****`)

### Method 2: Railway Logs
After deployment, check logs for:
```
✅ Using DATABASE_URL for session store
✅ Using PostgreSQL session store
```

If you see:
```
❌ ERROR: DATABASE_URL is required in production!
```
→ `DATABASE_URL` is missing

If you see:
```
⚠️ PostgreSQL session store failed
```
→ `DATABASE_URL` or `DATABASE_PUBLIC_URL` is incorrect

---

## 🚨 Common Issues

### Issue 1: Missing DATABASE_URL
**Symptom:** Database connection errors
**Fix:**
1. Go to **PostgreSQL Service** → **Variables**
2. Copy `DATABASE_URL` or `DATABASE_PUBLIC_URL`
3. Go to **Backend Service** → **Variables**
4. Add `DATABASE_PUBLIC_URL` if not present

### Issue 2: Missing SESSION_SECRET
**Symptom:** Sessions not working, 401 errors
**Fix:**
1. Generate secret: `openssl rand -hex 32`
2. Add to Railway Variables: `SESSION_SECRET`

### Issue 3: Missing JWT_SECRET
**Symptom:** Token generation fails
**Fix:**
1. Generate secret: `openssl rand -hex 32`
2. Add to Railway Variables: `JWT_SECRET`

### Issue 4: NODE_ENV Not Set
**Symptom:** Development mode behavior in production
**Fix:**
1. Add `NODE_ENV=production` to Railway Variables

---

## 📋 Quick Checklist

Before deploying, verify:
- [ ] `DATABASE_URL` or `DATABASE_PUBLIC_URL` exists
- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is set (not empty)
- [ ] `SESSION_SECRET` is set (not empty)
- [ ] All email variables set (if using email)
- [ ] Backend service is connected to PostgreSQL service

---

## 🔗 Related Files

- `.env.example` - Template for local development
- `app.js` - Uses `SESSION_SECRET`, `DATABASE_URL`
- `config/database/postgresql.js` - Uses `DATABASE_URL`, `DATABASE_PUBLIC_URL`
- `rolebaseaccess/*/authentication/*.js` - Uses `JWT_SECRET`

---

## 📝 Notes

- **Railway automatically shares** `DATABASE_URL` from PostgreSQL service to connected services
- **Always use `DATABASE_PUBLIC_URL`** if you need external access (pgAdmin, etc.)
- **Secrets should be long random strings** - never use default values in production
- **Variables are case-sensitive** - use exact names as shown above

