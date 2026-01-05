# IMMEDIATE FIX - Run This SQL Now

## 🔴 Problem
Admin login getting 500 error because `controlDevicePower` column is missing.

## ✅ Quick Fix - Run This SQL in Railway PostgreSQL Console

### Steps:
1. **Railway Dashboard** → **PostgreSQL Service** (not backend service)
2. Click **"Database"** tab
3. Click **"Connect"** → **"PostgreSQL Console"**
4. **Copy and paste this SQL:**

```sql
-- Add missing columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;
```

5. Click **"Run"** or press Enter
6. Wait for success message
7. **Backend service will auto-restart** (or manually redeploy)

## ✅ Verify It Worked

After running SQL, verify columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')
ORDER BY column_name;
```

You should see all 3 columns listed.

## 🎯 After Running SQL

1. ✅ Admin login 500 error will stop
2. ✅ EventScheduler errors will stop
3. ✅ All login attempts will work properly

## 📋 Why This Happened

- Migration script exists but hasn't run yet
- Pre-deploy command might not be set in Railway
- EventScheduler starts immediately and queries events table
- Missing column causes 500 error

## 🔄 For Future Deployments

Set pre-deploy command in Railway Settings:
- Go to Backend Service → Settings → Deploy
- Pre-deploy Command: `npm run migrate`
- This will run migration automatically on every deploy

