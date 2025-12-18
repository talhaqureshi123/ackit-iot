# Database Connection Fix - Railway

## 🚨 Error: `ECONNREFUSED ::1:5432`

**Problem:** App is trying to connect to `localhost` (`::1:5432`) instead of Railway database.

**Cause:** `DATABASE_URL` environment variable is not set in Railway.

## ✅ Solution

### Step 1: Check if PostgreSQL Service Exists

1. Go to Railway Dashboard → Your Project
2. Check if you have a **Postgres** service
3. If not, add it:
   - Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**

### Step 2: Verify DATABASE_URL in Backend Service

1. Go to your **Backend Service** (not Postgres service)
2. Click **"Variables"** tab
3. Look for `DATABASE_URL`
4. **If missing:**

   **Option A: Railway Auto-Share (Recommended)**
   - Railway should automatically share `DATABASE_URL` from Postgres service
   - If not visible, try:
     - Go to Postgres service → Variables
     - Copy `DATABASE_URL` value
     - Go to Backend service → Variables
     - Click **"+ New Variable"**
     - Name: `DATABASE_URL`
     - Value: Paste the connection string
     - Click **"Add"**

   **Option B: Manual Setup**
   - Go to Postgres service → Variables tab
   - Find `DATABASE_URL` or construct from:
     - `PGHOST`
     - `PGPORT`
     - `PGUSER`
     - `PGPASSWORD`
     - `PGDATABASE`
   - Format: `postgresql://PGUSER:PGPASSWORD@PGHOST:PGPORT/PGDATABASE`
   - Add to Backend service Variables

### Step 3: Verify NODE_ENV

Make sure `NODE_ENV=production` is set in Backend service Variables.

### Step 4: Redeploy

1. After adding `DATABASE_URL`, Railway will auto-redeploy
2. Or manually trigger: **Deployments** → **"Redeploy"**

### Step 5: Check Logs

After redeploy, check logs for:
- ✅ `✅ Using DATABASE_URL from Railway`
- ✅ `✅ Database connection established successfully.`
- ❌ Should NOT see: `ECONNREFUSED ::1:5432`

## 🔍 Debugging

### Check Current Variables

In Railway logs, you should see:
```
🔍 Checking env values...
NODE_ENV: production
DATABASE_URL exists: true
✅ Using DATABASE_URL from Railway
DATABASE_URL: postgresql://postgres:****@host:port/database
```

If you see:
```
DATABASE_URL exists: false
❌ ERROR: DATABASE_URL is required in production!
```

Then `DATABASE_URL` is missing - follow Step 2 above.

## 📋 Quick Checklist

- [ ] PostgreSQL service exists in Railway project
- [ ] `DATABASE_URL` exists in Backend service Variables
- [ ] `NODE_ENV=production` is set
- [ ] Service redeployed after adding variables
- [ ] Logs show successful database connection

## 🆘 Still Not Working?

1. **Check Postgres Service Status:**
   - Postgres service should be running (green status)

2. **Verify Connection String Format:**
   - Should start with `postgresql://`
   - Should include: user, password, host, port, database

3. **Check Service Linking:**
   - Both services (Backend + Postgres) should be in same Railway project
   - Railway auto-shares variables within same project

4. **Try Manual Variable:**
   - Copy `DATABASE_URL` from Postgres service
   - Manually add to Backend service Variables

---

**After fixing, your app will connect to Railway PostgreSQL successfully!** 🎉

