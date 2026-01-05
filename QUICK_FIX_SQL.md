# Quick Fix: Add Missing Columns to Events Table

## 🔴 Problem
Railway logs show: `column "controlDevicePower" does not exist`

## ✅ Immediate Fix: Run SQL in Railway PostgreSQL Console

### Steps:

1. **Go to Railway Dashboard**
   - Open your PostgreSQL service (not the backend service)
   - Click **"Database"** tab
   - Click **"Connect"** → **"PostgreSQL Console"**

2. **Run this SQL:**

```sql
-- Add missing columns
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;
```

3. **Verify columns were added:**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')
ORDER BY column_name;
```

4. **Restart Backend Service**
   - Go to your backend service in Railway
   - Click "Redeploy" or wait for auto-restart
   - Errors should stop immediately

## ✅ Expected Result

After running SQL:
- ✅ `controlDevicePower` column added
- ✅ `deviceOnTime` column added  
- ✅ `deviceOffTime` column added
- ✅ EventScheduler errors stop
- ✅ Admin login works

## 📋 Why This Happened

- Event model includes `controlDevicePower` in SELECT queries
- Database table was missing this column
- Migration script was added but hasn't run yet
- Running SQL directly fixes it immediately

