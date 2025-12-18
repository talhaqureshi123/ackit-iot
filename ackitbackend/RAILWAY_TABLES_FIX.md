# Railway Database Tables Missing - Fix Guide

## 🚨 Error: `relation "events" does not exist`

**Problem:** Railway database empty hai - tables create nahi hui hain.

**Cause:** Railway creates empty database. Tables manually create karni padti hain.

## ✅ Solution: Create Tables

### Method 1: Using Railway CLI (Recommended)

```bash
# 1. Install Railway CLI (if not installed)
npm i -g @railway/cli

# 2. Login
railway login

# 3. Link to your project
cd ackitbackend
railway link

# 4. Initialize database (create all tables)
railway run node migrations/init-database.js
```

### Method 2: Using pgAdmin

1. **Connect to Railway Database:**
   - Railway Dashboard → Postgres Service → Variables
   - `DATABASE_PUBLIC_URL` copy karein
   - pgAdmin → Create Server → Connection details:
     - Host: Railway host
     - Port: 5432
     - Database: railway
     - Username: postgres
     - Password: Railway password
     - SSL: Require

2. **Run SQL Script:**
   - Railway database → Query Tool
   - Local database se schema export karein
   - Ya manually tables create karein

### Method 3: Local Database Se Schema Export

**If you have local database with tables:**

```bash
# 1. Export schema only (no data)
pg_dump -h localhost -U postgres -d your_database --schema-only > schema.sql

# 2. Import to Railway
railway connect postgres < schema.sql
```

## 📋 What Gets Created?

After running `init-database.js`, these tables will be created:

- ✅ `admins`
- ✅ `managers`
- ✅ `superadmins`
- ✅ `organizations`
- ✅ `venues`
- ✅ `acs`
- ✅ `events`
- ✅ `activityLogs`
- ✅ `systemStates`
- ✅ `session` (for express-session)

## 🔍 Verify Tables

**Using Railway CLI:**
```bash
railway connect postgres
# Then in psql:
\dt
```

**Using Railway Dashboard:**
- Postgres Service → **"Data"** tab
- Tables list dikhni chahiye

## 🆘 Troubleshooting

### "Permission denied" Error
- Railway manages permissions automatically
- If issue persists, check Postgres service status

### "Table already exists" Error
- Tables already created hain
- Script safely handles existing tables

### Connection Fails
- Verify `DATABASE_URL` or `DATABASE_PUBLIC_URL` is set
- Check Postgres service is Online

## ✅ After Tables Created

1. **Check Logs:**
   - Should see: `✅ Database connection established successfully.`
   - Should NOT see: `relation "events" does not exist`

2. **Test App:**
   - Health endpoint: `https://your-service.railway.app/health`
   - Should work without errors

---

**Quick Fix:** Run `railway run node migrations/init-database.js` to create all tables!

