# 🚨 Deployment Fix Guide - Local vs Production Database Issues

## 🔴 Problem Summary
- **Local:** Login easily ho raha hai ✅
- **Production (Railway):** 
  - Admin login: **500 error** (controlDevicePower column missing)
  - Superadmin/Manager login: **401 error** (password mismatch)

## ✅ IMMEDIATE FIX - Do This NOW

### Step 1: Fix Missing Column (500 Error Fix)

**Railway PostgreSQL Console में जाएं:**
1. Railway Dashboard → **PostgreSQL Service**
2. **"Database"** tab → **"Connect"** → **"PostgreSQL Console"**
3. **यह SQL run करें:**

```sql
-- Add missing columns (fixes 500 error immediately)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;
```

4. **Verify:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime');
```

### Step 2: Fix Password Issues (401 Error Fix)

**Option A: Reset Password via Script (Recommended)**

Railway CLI से:
```bash
railway run npm run setup-users
```

**Option B: Check Password Status**

Railway PostgreSQL Console में:
```sql
-- Check admin password
SELECT id, email, name, status,
       CASE 
         WHEN password IS NULL THEN 'NULL'
         WHEN password = '' THEN 'EMPTY'
         WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
         ELSE 'VALID'
       END as password_status,
       LENGTH(password) as password_length
FROM admins
WHERE email = 'usman.abid00321@gmail.com';
```

**If password_status is NOT 'VALID':**
- Run: `railway run npm run setup-users`
- This will reset password to: `admin123` (or SEED_ADMIN_PASSWORD from env)

### Step 3: Backend Restart

After SQL changes:
- Backend will auto-restart
- Or manually redeploy from Railway Dashboard

## 🔍 Why Local Works But Production Doesn't

### Local Database:
- ✅ All columns exist (migrations already run)
- ✅ Passwords are correct (local setup done)
- ✅ Schema is up-to-date

### Production Database:
- ❌ Missing `controlDevicePower` column (migration not run yet)
- ❌ Passwords might be different/old hash
- ❌ Schema not synced with local

## 📋 Prevention: Set Pre-Deploy Command

**Railway Settings → Deploy → Pre-deploy Command:**
```
npm run migrate:all
```

**यह automatically:**
- Missing columns add करेगा
- Schema verify करेगा
- Password issues check करेगा

## 🎯 Complete Fix Checklist

- [ ] Run SQL to add missing columns (Step 1)
- [ ] Check password status (Step 2)
- [ ] Reset passwords if needed (setup-users script)
- [ ] Set pre-deploy command (prevention)
- [ ] Test admin login
- [ ] Test manager login

## ⚡ Quick Commands

```bash
# Fix columns + verify
railway run npm run migrate:all

# Reset passwords
railway run npm run setup-users

# Verify everything
railway run npm run migrate:verify
```

