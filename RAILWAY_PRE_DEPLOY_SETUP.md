# Railway Pre-Deploy Migration Setup

## ✅ Automatic Migration on Deploy

Migration script automatically run होगी जब backend redeploy होगा।

## 📋 Railway Settings में Setup करें

### Step 1: Railway Dashboard में जाएं
1. Railway Dashboard → Your Backend Service → **Settings** tab
2. **"Deploy"** section में scroll करें
3. **"Pre-deploy Command"** field find करें

### Step 2: Pre-deploy Command Add करें

**Option 1: Simple (Recommended)**
```
npm run migrate
```

**Option 2: Complete (All migrations)**
```
npm run migrate:all
```

**Option 3: Custom Script**
```
node scripts/pre-deploy.js
```

### Step 3: Save और Redeploy

1. Settings save करें
2. **"Redeploy"** button click करें
3. Migration automatically run होगी
4. Logs में migration output दिखेगा

## ✅ Available Migration Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **migrate** | `npm run migrate` | Missing columns add करता है (fastest) |
| **migrate:all** | `npm run migrate:all` | सभी critical migrations |
| **migrate:complete** | `npm run migrate:complete` | Complete schema fix |
| **migrate:passwords** | `npm run migrate:passwords` | Email/password verification |
| **pre-deploy** | `npm run pre-deploy` | Pre-deploy script (runs migrate) |

## 🔍 Verify Migration Ran

Deployment logs में यह दिखेगा:
```
🚀 Starting pre-deploy migrations...
📋 Running migration: Add missing columns...
✅ controlDevicePower column added
✅ deviceOnTime column added
✅ deviceOffTime column added
✅ All pre-deploy migrations completed successfully!
```

## ⚠️ Important Notes

1. **Migration is Safe**: Scripts use `IF NOT EXISTS` - multiple runs are safe
2. **No Data Loss**: Migrations only add columns, don't modify existing data
3. **If Migration Fails**: Deployment will continue (won't block deploy)
4. **Manual Run**: अगर automatic नहीं चले, manually run करें:
   ```bash
   railway run npm run migrate
   ```

## 📝 What Gets Fixed

✅ Missing `controlDevicePower` column (fixes 500 errors)
✅ Missing `deviceOnTime` column
✅ Missing `deviceOffTime` column
✅ Timezone fixes (if needed)
✅ Database schema synchronization

## 🎯 Next Steps

1. Railway Settings में pre-deploy command set करें
2. Backend service redeploy करें
3. Logs check करें - migration output देखें
4. Admin login try करें - errors fix हो जाने चाहिए

