# Railway 500 Error Fix - Login Issue

## 🚨 Problem: 500 Internal Server Error on Login

**Error:** `POST /api/superadmin/login 500 (Internal Server Error)`

## 🔍 Possible Causes

1. **Session Store Issue** - PostgreSQL session table creation failed
2. **Database Connection** - Session store can't connect to database
3. **Missing Environment Variables** - `DATABASE_URL` or `SESSION_SECRET` missing

## ✅ Solutions

### Step 1: Check Railway Backend Logs

**Railway Dashboard** → **Backend Service** → **Logs** tab

Look for:
- ❌ Session store errors
- ❌ Database connection errors
- ❌ Specific error messages

### Step 2: Verify Environment Variables

**Railway Dashboard** → **Backend Service** → **Variables**

**Required:**
- ✅ `DATABASE_URL` or `DATABASE_PUBLIC_URL`
- ✅ `SESSION_SECRET`
- ✅ `JWT_SECRET`
- ✅ `NODE_ENV=production`

### Step 3: Check Session Table

**Using Railway CLI:**
```bash
railway connect postgres
# Then in psql:
\dt
# Look for "session" table
```

**If session table missing:**
- Code automatically creates it (`createTableIfMissing: true`)
- If still missing, check logs for creation errors

### Step 4: Verify SuperAdmin Exists

**Railway Dashboard** → **Postgres Service** → **Data** tab
- Check `superadmins` table
- Verify user exists with email: `talhaabid400@gmail.com`

### Step 5: Check Password

Agar password hash mismatch ho:
- Local database se original password check karein
- Ya Railway database mein password update karein

## 🔧 Quick Fixes

### Fix 1: Add DATABASE_PUBLIC_URL

**Railway Dashboard** → **Backend Service** → **Variables**
- Add: `DATABASE_PUBLIC_URL` = Postgres service se copy karein

### Fix 2: Verify Session Store

**Railway Logs** mein check karein:
- Should see: `✅ Using PostgreSQL session store`
- Should NOT see: `⚠️ PostgreSQL session store failed`

### Fix 3: Restart Backend

**Railway Dashboard** → **Deployments** → **Redeploy**

## 📋 Debugging Checklist

- [ ] Railway logs check kiye
- [ ] `DATABASE_URL` or `DATABASE_PUBLIC_URL` set hai
- [ ] `SESSION_SECRET` set hai
- [ ] `JWT_SECRET` set hai
- [ ] SuperAdmin exists in database
- [ ] Session table exists
- [ ] Backend service restarted

## 🆘 Still Not Working?

**Railway Logs** share karein - specific error message se exact issue identify kar sakte hain.

---

**Most Common Fix:** Add `DATABASE_PUBLIC_URL` in Railway Variables!

