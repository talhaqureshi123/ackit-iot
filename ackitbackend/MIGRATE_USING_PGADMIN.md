# Migrate Database to Railway using pgAdmin

## 📋 Prerequisites

1. **pgAdmin installed** on your local machine
2. **Local database** running
3. **Railway PostgreSQL** service created
4. **Railway DATABASE_URL** from Railway dashboard

## 🔗 Step 1: Get Railway Database Connection Details

### From Railway Dashboard:

1. Go to **Postgres Service** → **Variables** tab
2. Note down these values:
   - `PGHOST` - Database host
   - `PGPORT` - Port (usually 5432)
   - `PGUSER` - Username (usually `postgres`)
   - `PGPASSWORD` - Password
   - `PGDATABASE` - Database name (usually `railway`)
   - `DATABASE_PUBLIC_URL` - Full connection string (for external access)

**OR** use `DATABASE_PUBLIC_URL` directly:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

## 🔌 Step 2: Connect to Railway Database in pgAdmin

### Method A: Using Connection String

1. **Open pgAdmin**
2. **Right-click on "Servers"** → **"Create"** → **"Server"**
3. **General Tab:**
   - Name: `Railway Production` (or any name)
4. **Connection Tab:**
   - **Host:** Extract from `DATABASE_PUBLIC_URL` or use `PGHOST`
     - Example: `containers-us-west-123.railway.app`
   - **Port:** `5432` (or from `PGPORT`)
   - **Maintenance database:** `railway` (or from `PGDATABASE`)
   - **Username:** `postgres` (or from `PGUSER`)
   - **Password:** From `PGPASSWORD` (click eye icon in Railway to reveal)
   - **Save password:** ✅ Check this
5. **SSL Tab:**
   - **SSL mode:** `Require` or `Prefer`
   - Click **"Save"**

### Method B: Parse DATABASE_PUBLIC_URL

If Railway gives you `DATABASE_PUBLIC_URL`:
```
postgresql://postgres:abc123@containers-us-west-123.railway.app:5432/railway
```

Break it down:
- **Host:** `containers-us-west-123.railway.app`
- **Port:** `5432`
- **Database:** `railway`
- **Username:** `postgres`
- **Password:** `abc123`

## 📤 Step 3: Export Local Database

1. **Connect to your local database** in pgAdmin
2. **Right-click on your database** → **"Backup..."**
3. **Backup Options:**
   - **Filename:** Choose location (e.g., `C:\backups\local_db_backup.sql`)
   - **Format:** `Plain` (for SQL file)
   - **Encoding:** `UTF8`
4. **Dump Options Tab:**
   - ✅ **Only schema** (if you want structure only)
   - ✅ **Only data** (if you want data only)
   - ✅ **Both** (recommended - schema + data)
   - ✅ **Blobs** (if you have binary data)
5. Click **"Backup"**
6. Wait for backup to complete

## 📥 Step 4: Import to Railway Database

1. **Connect to Railway database** in pgAdmin (from Step 2)
2. **Right-click on Railway database** → **"Restore..."**
3. **Restore Options:**
   - **Filename:** Select the backup file from Step 3
   - **Format:** `Custom or tar` (if .backup) or `Plain` (if .sql)
4. **Restore Options Tab:**
   - ✅ **Pre-data** (schema)
   - ✅ **Data** (data)
   - ✅ **Post-data** (indexes, constraints)
5. Click **"Restore"**
6. Wait for import to complete

## 🔄 Alternative: Using Query Tool (For SQL Files)

If you exported as `.sql` file:

1. **Connect to Railway database**
2. **Right-click on database** → **"Query Tool"**
3. **Open SQL file:**
   - Click **"Open File"** icon
   - Select your `.sql` backup file
4. **Execute:**
   - Click **"Execute"** (F5)
   - Wait for all queries to complete

## ✅ Step 5: Verify Migration

1. **In pgAdmin, expand Railway database:**
   - Check **"Schemas"** → **"public"** → **"Tables"**
   - All your tables should be visible
2. **Check data:**
   - Right-click on a table → **"View/Edit Data"** → **"All Rows"**
   - Verify data is present

## 🚀 Step 6: Update Railway Backend Service

1. **Railway Dashboard** → **Backend Service** → **Variables**
2. **Verify `DATABASE_URL` exists:**
   - Should be automatically shared from Postgres service
   - If not, add it manually (see previous guides)
3. **Redeploy backend:**
   - Railway will auto-redeploy
   - Or manually: **Deployments** → **"Redeploy"**

## 🔍 Step 7: Check Application Logs

After redeploy, check Railway logs for:
```
✅ Using DATABASE_URL from Railway
✅ Database connection established successfully.
```

## 🆘 Troubleshooting

### Connection Failed in pgAdmin

**Error: "Connection refused"**
- Check Railway Postgres service is **Online**
- Verify host, port, username, password
- Check SSL settings (try `Prefer` or `Require`)

**Error: "SSL required"**
- In pgAdmin Connection → SSL tab
- Set SSL mode to `Require`

**Error: "Authentication failed"**
- Double-check username and password from Railway Variables
- Make sure you're using `PGPASSWORD` not `POSTGRES_PASSWORD`

### Import Failed

**Error: "Table already exists"**
- Drop existing tables first:
  - Right-click database → **"Query Tool"**
  - Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
  - Then retry import

**Error: "Permission denied"**
- Railway manages permissions automatically
- If issue persists, check Railway Postgres service status

**Error: "Connection timeout"**
- Large databases may timeout
- Try importing in smaller chunks
- Or use Railway CLI instead

## 📊 Quick Reference

### Railway Connection Details Location:
- **Railway Dashboard** → **Postgres Service** → **Variables Tab**

### pgAdmin Connection Settings:
```
Host: containers-us-west-XXX.railway.app (from PGHOST)
Port: 5432 (from PGPORT)
Database: railway (from PGDATABASE)
Username: postgres (from PGUSER)
Password: [from PGPASSWORD - click eye icon]
SSL: Require
```

### Backup File Location:
- Save to: `C:\backups\` or any accessible location
- Format: `.sql` (Plain) or `.backup` (Custom)

## ✅ Success Checklist

- [ ] Railway Postgres service is Online
- [ ] Connected to Railway database in pgAdmin
- [ ] Local database backed up successfully
- [ ] Data imported to Railway database
- [ ] Tables and data verified in Railway database
- [ ] `DATABASE_URL` set in Backend service Variables
- [ ] Backend service logs show successful connection

---

**After migration, your Railway app will use the Railway database!** 🎉

