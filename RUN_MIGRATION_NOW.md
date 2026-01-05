# 🚀 Migration Run करें - Step by Step

## ✅ Option 1: Railway CLI से (Recommended)

### Step 1: Terminal में Railway CLI install करें (अगर नहीं है)
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Project Link करें
```bash
cd ackitbackend
railway link
```
- Project select करें: `ackit-iot` या `heroic-vibrancy`

### Step 3: Service Select करें
```bash
railway service
```
- **Backend service** select करें (frontend नहीं)

### Step 4: Migration Run करें
```bash
railway run npm run migrate:all
```

**या direct:**
```bash
railway run node migrations/run-all-required-migrations.js
```

## ✅ Option 2: Railway Dashboard से SQL (Fastest)

### Step 1: PostgreSQL Console खोलें
1. Railway Dashboard → **PostgreSQL Service** (backend service नहीं)
2. **"Database"** tab → **"Connect"** → **"PostgreSQL Console"**

### Step 2: Complete SQL Run करें

**File:** `QUICK_FIX_ALL_COLUMNS.sql` को copy-paste करें

**या यह SQL run करें:**

```sql
-- Events table columns
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;

-- Admins plan column
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS "plan" VARCHAR(20) DEFAULT 'basic';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admins_plan_check'
    ) THEN
        ALTER TABLE admins 
        ADD CONSTRAINT admins_plan_check 
        CHECK ("plan" IN ('basic', 'advanced', 'premium', 'custom'));
    END IF;
END$$;

UPDATE admins 
SET "plan" = 'basic' 
WHERE "plan" IS NULL;
```

## ✅ Option 3: Railway Dashboard - Redeploy (Automatic)

### Step 1: Pre-deploy Command Set करें
1. Railway Dashboard → **Backend Service** → **Settings**
2. **"Deploy"** section → **"Pre-deploy Command"**
3. Enter: `npm run migrate:all`
4. **Save** करें

### Step 2: Redeploy करें
1. **"Deployments"** tab
2. **"Redeploy"** button click करें
3. Migration automatically run होगी

## 🔍 Verify Migration Ran

### Check Logs:
Railway Dashboard → Deployments → Latest deployment → Logs

**यह दिखना चाहिए:**
```
🚀 Starting all required migrations...
📋 [1/4] Adding missing columns to events table...
✅ controlDevicePower column added
✅ deviceOnTime column added
✅ deviceOffTime column added
📋 [3/4] Adding missing columns to admins table...
✅ plan column added
✅ All required migrations completed successfully!
```

### Check Database:
```sql
-- Verify events columns
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime');

-- Verify admins plan column
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'admins' 
AND column_name = 'plan';
```

## ⚡ Quick Commands Summary

```bash
# Railway CLI से migration
railway run npm run migrate:all

# Verify columns
railway run npm run migrate:verify

# Check user passwords
railway run npm run check-user

# Reset passwords (if needed)
railway run npm run setup-users
```

## 🎯 Recommended: Use SQL (Fastest)

**Railway PostgreSQL Console में:**
- `QUICK_FIX_ALL_COLUMNS.sql` file को open करें
- सारा SQL copy-paste करें
- Run करें
- ✅ Done! (2 minutes में fix हो जाएगा)

