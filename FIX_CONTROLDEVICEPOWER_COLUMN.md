# Fix: Missing controlDevicePower Column Error

## 🔴 Problem
Railway logs show:
```
SequelizeDatabaseError: column "controlDevicePower" does not exist
```

This is causing 500 errors because EventScheduler tries to query events table on startup.

## ✅ Solution: Add Missing Columns

### Option 1: Run Migration Script (Recommended)

**Via Railway CLI:**
```bash
railway run node ackitbackend/migrations/add-missing-columns-railway.js
```

**Or via Railway Dashboard:**
1. Go to Railway Dashboard → Your Service → Deployments
2. Click "New Deployment" → "Run Command"
3. Enter: `node ackitbackend/migrations/add-missing-columns-railway.js`

### Option 2: Run SQL Directly in Railway PostgreSQL Console

1. Go to Railway Dashboard → Your PostgreSQL Service → Database tab
2. Click "Connect" → "PostgreSQL Console"
3. Run this SQL:

```sql
-- Add controlDevicePower column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

-- Add deviceOnTime column  
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

-- Add deviceOffTime column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN events."controlDevicePower" IS 'Whether this event controls device power (on/off)';
COMMENT ON COLUMN events."deviceOnTime" IS 'When to turn device ON (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';
COMMENT ON COLUMN events."deviceOffTime" IS 'When to turn device OFF (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')
ORDER BY column_name;
```

## ✅ After Running Migration

1. **Restart Railway Service**
   - The backend should restart automatically
   - Or manually redeploy

2. **Verify Fix**
   - Check Railway logs - EventScheduler errors should stop
   - Try admin login again - should work now

3. **Test**
   - Admin login should work
   - EventScheduler should run without errors

## 📋 What This Fixes

- ✅ Adds missing `controlDevicePower` column
- ✅ Adds missing `deviceOnTime` column  
- ✅ Adds missing `deviceOffTime` column
- ✅ Fixes EventScheduler crash on startup
- ✅ Fixes 500 errors on admin login (if caused by EventScheduler)

