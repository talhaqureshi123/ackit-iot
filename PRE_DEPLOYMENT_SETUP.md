# 🚀 Pre-Deployment Migration Setup

## ✅ Complete Pre-Deploy File

**File:** `ackitbackend/scripts/pre-deploy.js`

यह file automatically सभी migrations run करती है:

1. ✅ Events table missing columns (controlDevicePower, deviceOnTime, deviceOffTime)
2. ✅ Recurring event columns (isRecurring, recurringType, etc.)
3. ✅ Timezone fixes (TIMESTAMPTZ conversion)
4. ✅ Admins table plan column
5. ✅ Schema verification & password checks

## 📋 Railway में Setup करें

### Step 1: Railway Dashboard खोलें
1. Railway Dashboard → **Backend Service** (ackit-iot)
2. **Settings** tab → **Deploy** section

### Step 2: Pre-deploy Command Set करें

**Option 1: Simple (Recommended)**
```
npm run pre-deploy
```

**Option 2: Direct Migration Script**
```
npm run migrate:all
```

**Option 3: Custom Script**
```
node scripts/pre-deploy.js
```

### Step 3: Save और Deploy
1. **Save** करें
2. **Redeploy** करें (या next deployment automatically run होगी)

## 🔍 What Happens on Deploy

```
1. Railway starts deployment
2. Runs: npm run pre-deploy
   → Calls: scripts/pre-deploy.js
   → Runs: migrations/run-all-required-migrations.js
   → Adds all missing columns
   → Fixes timezone issues
   → Adds plan column to admins
   → Verifies schema
3. Starts server: npm start
4. ✅ Everything is ready!
```

## 📝 Migration Checklist

Pre-deploy script automatically runs:

- [x] Events table: controlDevicePower column
- [x] Events table: deviceOnTime column
- [x] Events table: deviceOffTime column
- [x] Events table: Recurring event columns (11 columns)
- [x] Events table: Timezone fixes (TIMESTAMPTZ)
- [x] Admins table: plan column
- [x] Schema verification
- [x] Password status checks

## ✅ Verify It's Working

**Deployment logs में यह दिखेगा:**
```
🚀 Starting pre-deploy migrations...
📋 Pre-Deploy Migration Checklist:
   1. Add missing columns to events table
   2. Add recurring event columns
   3. Fix timezone columns (if needed)
   4. Add missing columns to admins table (plan)
   5. Verify database schema & check user passwords
📋 [1/4] Adding missing columns to events table...
✅ controlDevicePower column added
✅ deviceOnTime column added
✅ deviceOffTime column added
📋 [3/4] Adding missing columns to admins table...
✅ plan column added
✅ All required migrations completed successfully!
✨ Database is ready for deployment!
```

## ⚠️ Important Notes

1. **Safe to Run Multiple Times**: Scripts use `IF NOT EXISTS` - won't break if columns already exist
2. **No Data Loss**: Migrations only add columns, don't modify existing data
3. **If Migration Fails**: Deployment continues (won't block deploy)
4. **Manual Run**: `railway run npm run migrate:all`

## 🎯 Recommended Setup

**Railway Settings → Pre-deploy Command:**
```
npm run pre-deploy
```

**यह automatically:**
- सभी missing columns add करेगा
- Schema verify करेगा
- Password issues check करेगा
- Production DB को local DB के साथ sync करेगा

## 📁 Files

- **Pre-deploy script:** `ackitbackend/scripts/pre-deploy.js`
- **Master migration:** `ackitbackend/migrations/run-all-required-migrations.js`
- **Package.json script:** `npm run pre-deploy` or `npm run migrate:all`

## ⚡ Quick Commands

```bash
# Run pre-deploy locally (test)
npm run pre-deploy

# Run on Railway
railway run npm run pre-deploy

# Or use migrate:all directly
railway run npm run migrate:all
```

