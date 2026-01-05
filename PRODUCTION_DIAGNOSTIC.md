# 🔍 Production Database Diagnostic Guide

## 🚨 Current Issue Analysis

From Railway logs:
```
❌ Manager not found with email: usman.abid00321@gmail.com
```

**This is EXPECTED** because:
- `usman.abid00321@gmail.com` is an **ADMIN** email, not a manager
- Manager login 401 error is correct - email doesn't exist in managers table
- The real issues are:
  1. **Admin login: 500 error** (controlDevicePower column missing)
  2. **Superadmin login: 401 error** (password mismatch or email not found)

## ✅ Diagnostic Steps

### Step 1: Check Where Email Exists

Run this to see which table(s) contain the email:

```bash
railway run npm run check-user
```

Or check specific email:
```bash
railway run npm run check-user usman.abid00321@gmail.com
```

**This will show:**
- ✅ Which table(s) contain the email (superadmin/admin/manager)
- ✅ Password status (VALID/INVALID_HASH/NULL/EMPTY)
- ✅ User status (active/suspended/locked)

### Step 2: Fix Missing Columns (500 Error)

**Option A: SQL (Fastest)**
```sql
-- Run in Railway PostgreSQL Console
ALTER TABLE events ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;
```

**Option B: Migration Script**
```bash
railway run npm run migrate:all
```

### Step 3: Fix Password Issues (401 Error)

If password status is NOT 'VALID':

```bash
railway run npm run setup-users
```

This will:
- Reset admin password to: `admin123` (or SEED_ADMIN_PASSWORD)
- Reset superadmin password to: `superadmin123` (or SEED_SUPERADMIN_PASSWORD)
- Create users if they don't exist

## 📋 Expected Results

### For `usman.abid00321@gmail.com`:

**Expected:**
- ✅ Found in **ADMIN** table
- ❌ NOT found in MANAGER table (this is correct!)
- ❌ NOT found in SUPERADMIN table (unless it's also a superadmin)

**If Admin password is VALID:**
- Admin login should work after fixing columns (500 → 200)

**If Admin password is INVALID:**
- Run `railway run npm run setup-users`
- Then try login again

## 🎯 Complete Fix Checklist

- [ ] Run diagnostic: `railway run npm run check-user`
- [ ] Fix missing columns (SQL or migration)
- [ ] Check password status
- [ ] Reset passwords if needed: `railway run npm run setup-users`
- [ ] Test admin login
- [ ] Test superadmin login (if email exists there)
- [ ] Set pre-deploy command: `npm run migrate:all`

## 💡 Understanding the Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Admin 500 | `controlDevicePower` column missing | Run migration or SQL |
| Admin 401 | Wrong password or email not found | Run `setup-users` script |
| Manager 401 | Email not in managers table | **Expected** - email is admin, not manager |
| Superadmin 401 | Wrong password or email not found | Run `setup-users` script |

## 🔄 Quick Commands

```bash
# Check where email exists
railway run npm run check-user

# Fix columns
railway run npm run migrate:all

# Reset passwords
railway run npm run setup-users

# Check all passwords
railway run npm run migrate:passwords
```

