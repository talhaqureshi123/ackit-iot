# 👤 Create Admin User: talhaqureshi987@gmail.com

## ❌ Problem
Admin login failing with 401 error:
```
❌ Admin not found with email: talhaqureshi987@gmail.com
```

## ✅ Solution

### Option 1: Railway CLI (Recommended)

```bash
railway run npm run create-admin-talha
```

**या direct:**
```bash
railway run node making/create-admin-talhaqureshi.js
```

### Option 2: Check Email First

**Check if email exists in any table:**
```bash
railway run npm run check-user talhaqureshi987@gmail.com
```

**यह दिखाएगा:**
- Email किस table में है (superadmin/admin/manager)
- Password status (VALID/INVALID)

### Option 3: Create via SQL

**Railway PostgreSQL Console में:**
```sql
-- Check if exists
SELECT id, email, name, status 
FROM admins 
WHERE email = 'talhaqureshi987@gmail.com';

-- Create admin (password will be hashed via script)
-- Use script instead for proper password hashing
```

## 📋 Default Credentials

**After running script:**
- **Email:** `talhaqureshi987@gmail.com`
- **Password:** `admin123` (or `ADMIN_PASSWORD` env var)
- **Name:** `Talha Qureshi` (or `ADMIN_NAME` env var)
- **Status:** `active`
- **Plan:** `basic`

## 🔧 Custom Password

**Railway Environment Variables में set करें:**
```
ADMIN_PASSWORD=your_custom_password
ADMIN_NAME=Your Name
```

**फिर script run करें:**
```bash
railway run npm run create-admin-talha
```

## ✅ Verify

**After creating, check:**
```bash
railway run npm run check-user talhaqureshi987@gmail.com
```

**या login try करें:**
- Email: `talhaqureshi987@gmail.com`
- Password: `admin123` (or custom password)

## 📝 Script Details

**File:** `ackitbackend/making/create-admin-talhaqureshi.js`

**What it does:**
1. Checks if admin exists
2. Creates new admin if not exists
3. Updates password if exists
4. Sets status to `active`
5. Sets plan to `basic`

## 🎯 Quick Command

```bash
railway run npm run create-admin-talha
```

**Done! Admin user created/updated.**

