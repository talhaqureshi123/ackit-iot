# 🚨 URGENT FIX - Run This SQL IMMEDIATELY

## 🔴 Problem
- Admin login: **500 error** (controlDevicePower column missing)
- Superadmin/Manager login: **401 error** (password mismatch)

## ✅ IMMEDIATE FIX - Run SQL in Railway PostgreSQL Console

### Step 1: Open Railway PostgreSQL Console
1. Railway Dashboard → **PostgreSQL Service** (not backend)
2. Click **"Database"** tab
3. Click **"Connect"** → **"PostgreSQL Console"**

### Step 2: Run This SQL (Copy-Paste)

```sql
-- Fix 1: Add missing columns (fixes 500 error)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;

-- Fix 2: Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')
ORDER BY column_name;
```

### Step 3: Check Admin Password

```sql
-- Check if admin exists and password status
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

### Step 4: If Password is Invalid, Reset It

```sql
-- Get bcrypt hash for password (replace 'yourpassword' with actual password)
-- You'll need to run this via Node.js script, not SQL directly
-- Use: node making/setup-railway-users.js
```

## 🔄 After Running SQL

1. **Backend will auto-restart** (or manually redeploy)
2. **Admin login 500 error will stop**
3. **Try login again**

## ⚠️ If Password Issue Persists

Run this via Railway CLI:
```bash
railway run npm run setup-users
```

This will reset passwords for all users.

## 📋 Next: Set Pre-Deploy Command

After this fix, set in Railway Settings:
- **Pre-deploy Command:** `npm run migrate:all`

This will prevent future issues.

