# Railway Migration Guide - Fix Missing controlDevicePower Column

## 🔴 Problem
Missing `controlDevicePower` column in `events` table causing 500 errors.

## ✅ Solution: Run Migration via Railway CLI

### Step 1: Link Railway Project (if not linked)

```bash
railway link
```

Select your project: `heroic-vibrancy` or `ackit-iot`

### Step 2: Select Service (Backend Service)

```bash
railway service
```

Select the **backend service** (not frontend). It might be named:
- `ackit-backend`
- `ackit-iot-backend` 
- Or check your Railway dashboard

### Step 3: Run Migration

```bash
railway run node ackitbackend/migrations/add-missing-columns-railway.js
```

## Alternative: Run SQL Directly

If Railway CLI doesn't work, use Railway Dashboard:

1. Go to Railway Dashboard → **PostgreSQL Service** (not backend service)
2. Click **"Database"** tab
3. Click **"Connect"** → **"PostgreSQL Console"**
4. Run this SQL:

```sql
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;
```

## ✅ Verify Fix

After running migration:

1. Check Railway logs - EventScheduler errors should stop
2. Try admin login - should work now
3. Verify columns were added:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')
ORDER BY column_name;
```

## 📋 Expected Output

After successful migration:
```
✅ controlDevicePower column added
✅ deviceOnTime column added
✅ deviceOffTime column added
✅ All columns added successfully!
```

