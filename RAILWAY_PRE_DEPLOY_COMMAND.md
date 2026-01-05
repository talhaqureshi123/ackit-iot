# 🚀 Railway Pre-Deployment Command

## ✅ Command to Set in Railway

**Railway Dashboard → Your Service → Settings → Deploy → Pre-deploy Command:**

```
npm run migrate:all
```

## 📋 What This Does

This command automatically runs **before every deployment** and:

1. ✅ Adds missing columns (`controlDevicePower`, `deviceOnTime`, `deviceOffTime`)
2. ✅ Adds recurring event columns (if missing)
3. ✅ Fixes timezone issues (TIMESTAMPTZ conversion)
4. ✅ Verifies database schema
5. ✅ Checks admin/manager passwords status

## 🔧 How to Set It

### Step 1: Open Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Select your **backend service** (ackit-iot)

### Step 2: Go to Settings
1. Click **"Settings"** tab
2. Scroll down to **"Deploy"** section

### Step 3: Set Pre-deploy Command
1. Find **"Pre-deploy Command"** field
2. Enter: `npm run migrate:all`
3. Click **"Save"**

### Step 4: Deploy
- Next deployment will automatically run migrations before starting the server

## ⚡ Alternative Commands

If you want to run migrations + setup users (one-time only):

```
npm run migrate:all && npm run setup-users
```

**⚠️ Note:** `setup-users` resets passwords, so only use this if you need to reset user passwords.

## 📝 What Happens on Deploy

```
1. Railway starts deployment
2. Runs: npm run migrate:all
   → Adds missing columns
   → Fixes timezone issues
   → Verifies schema
3. Starts server: npm start
4. ✅ Everything is ready!
```

## 🎯 Recommended Setup

**Pre-deploy Command:**
```
npm run migrate:all
```

**This ensures:**
- ✅ Database schema is always up-to-date
- ✅ Missing columns are added automatically
- ✅ No more 500 errors from missing columns
- ✅ Production DB matches local DB structure

## 🔍 Verify It's Working

After setting the command, check deployment logs:
1. Railway Dashboard → Deployments
2. Click on latest deployment
3. Look for: `🚀 Starting all required migrations...`
4. Should see: `✅ All required migrations completed successfully!`

## ⚠️ Troubleshooting

**If migration fails:**
- Check Railway logs for error details
- Run manually: `railway run npm run migrate:all`
- Check database connection in Railway environment variables

**If columns still missing:**
- Run SQL directly in PostgreSQL Console (see URGENT_FIX.sql)
- Then set pre-deploy command for future deployments

