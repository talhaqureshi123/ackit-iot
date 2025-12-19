# Railway Database Mein SuperAdmin Create Karein

## 🚨 Problem: 500 Error on Login

**Cause:** Railway database empty hai - SuperAdmin user nahi hai.

## ✅ Solution: SuperAdmin Create Karein

### Method 1: Railway CLI Se (Recommended)

```bash
# 1. Railway CLI install (if not installed)
npm i -g @railway/cli

# 2. Login
railway login

# 3. Link project
cd ackitbackend
railway link

# 4. Create SuperAdmin
railway run node making/create-superadmin.js
```

**Default Credentials:**
- Email: `talhaabid400@gmail.com`
- Password: `superadmin123`

**Custom Credentials:**
```bash
railway variables set SEED_SUPERADMIN_EMAIL=your-email@gmail.com
railway variables set SEED_SUPERADMIN_PASSWORD=your-password
railway run node making/create-superadmin.js
```

### Method 2: pgAdmin Se (Manual)

1. **Connect to Railway Database:**
   - Railway Dashboard → Postgres Service → Variables
   - `DATABASE_PUBLIC_URL` copy karein
   - pgAdmin → Create Server → Connection:
     - Host: Railway host
     - Port: 5432
     - Database: railway
     - Username: postgres
     - Password: Railway password
     - SSL: Require

2. **Run SQL:**
   ```sql
   INSERT INTO superadmins (name, email, password, "isActive", "createdAt", "updatedAt")
   VALUES (
     'IoTify Super Admin',
     'talhaabid400@gmail.com',
     '$2a$12$YourHashedPasswordHere',
     true,
     NOW(),
     NOW()
   );
   ```

   **Password Hash Generate Karein:**
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('superadmin123', 12).then(hash => console.log(hash));"
   ```

### Method 3: Local Database Se Copy

Agar aapke local database mein SuperAdmin hai:

```bash
# 1. Local database se SuperAdmin export
pg_dump -h localhost -U postgres -d your_db -t superadmins --data-only > superadmin.sql

# 2. Railway database mein import
railway connect postgres < superadmin.sql
```

## 🔍 Verify SuperAdmin

**Using Railway CLI:**
```bash
railway connect postgres
# Then in psql:
SELECT id, name, email, "isActive" FROM superadmins;
```

**Using pgAdmin:**
- Railway database → superadmins table → View Data

## ✅ After Creating SuperAdmin

1. **Login Try Karein:**
   - Email: `talhaabid400@gmail.com`
   - Password: `superadmin123`

2. **Check Logs:**
   - Should see: `✅ SuperAdmin found`
   - Should NOT see: `❌ SuperAdmin not found`

## 🆘 Still Getting 500 Error?

1. **Check Railway Logs:**
   - Backend Service → Logs tab
   - Look for specific error message

2. **Verify Database Connection:**
   - Logs should show: `✅ Database connection established successfully.`

3. **Check Session Store:**
   - Verify PostgreSQL session table exists
   - Check `DATABASE_URL` is correct

---

**Quick Fix:** Run `railway run node making/create-superadmin.js` to create SuperAdmin!

