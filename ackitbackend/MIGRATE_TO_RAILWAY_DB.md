# How to Connect/Migrate Your Database to Railway

## 🔍 Understanding Railway Database

### Railway PostgreSQL = New Database
- Railway creates a **fresh PostgreSQL database** for you
- It's **NOT** your local database
- You need to **migrate your data** from local to Railway

## 📊 Two Scenarios

### Scenario 1: Use Railway PostgreSQL (Recommended for Production)

Railway creates a new database. You need to migrate your local data.

#### Step 1: Get Railway Database Connection String
1. Railway Dashboard → Postgres Service → Variables
2. Copy `DATABASE_URL` (or `DATABASE_PUBLIC_URL` for external access)

#### Step 2: Export Your Local Database
```bash
# From your local machine, export database
pg_dump -h localhost -U your_user -d your_database > backup.sql

# Or if using connection string
pg_dump "postgresql://user:pass@localhost:5432/dbname" > backup.sql
```

#### Step 3: Import to Railway Database
```bash
# Using Railway CLI
railway connect postgres < backup.sql

# Or using psql with Railway DATABASE_URL
psql "postgresql://postgres:PASSWORD@HOST:PORT/railway" < backup.sql
```

#### Step 4: Run Migrations (if you have migration files)
```bash
cd ackitbackend
railway run node migrations/run-migration.js
```

### Scenario 2: Connect to External Database (Your Existing Database)

If you have a database on AWS RDS, DigitalOcean, Heroku, etc., connect directly.

#### Step 1: Get Your External Database Connection String
Format: `postgresql://user:password@host:port/database`

#### Step 2: Add to Railway
1. Railway Dashboard → Backend Service → Variables
2. Add Variable:
   - Name: `DATABASE_URL`
   - Value: Your external database connection string
   - Click "Add"

#### Step 3: Update SSL Settings (if needed)
Your code already handles SSL in production. If your external DB requires specific SSL settings, update `config/database/postgresql.js`.

## 🚀 Quick Migration Guide

### Using Railway CLI (Easiest)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Link to your project
cd ackitbackend
railway link

# 4. Export local database
pg_dump "postgresql://user:pass@localhost:5432/localdb" > local_backup.sql

# 5. Import to Railway
railway connect postgres < local_backup.sql

# 6. Run migrations (if any)
railway run node migrations/run-migration.js
```

### Using pgAdmin or DBeaver

1. **Connect to Local Database:**
   - Export all tables/data

2. **Connect to Railway Database:**
   - Use `DATABASE_PUBLIC_URL` from Railway Variables
   - Import exported data

## 📋 What Gets Migrated?

- ✅ All tables
- ✅ All data (rows)
- ✅ Schema/structure
- ✅ Indexes
- ❌ Users/permissions (Railway manages these)

## 🔐 Security Notes

### Railway Database:
- ✅ Automatically secured
- ✅ SSL enabled
- ✅ Managed by Railway
- ✅ Backups available (in paid plans)

### External Database:
- ✅ You manage security
- ✅ Ensure SSL is enabled
- ✅ Update firewall rules to allow Railway IPs

## 🆘 Troubleshooting

### "Connection Refused" Error
- Check if external database allows Railway IPs
- Verify connection string format
- Check SSL settings

### Migration Fails
- Check database size limits
- Verify user permissions
- Check connection timeout settings

### Data Not Appearing
- Verify import completed successfully
- Check table names match
- Verify migrations ran successfully

## ✅ After Migration

1. **Test Connection:**
   - Check Railway logs for: `✅ Database connection established successfully.`

2. **Verify Data:**
   - Use Railway Database tab to browse tables
   - Or connect with: `railway connect postgres`

3. **Update App:**
   - Your app will automatically use Railway database
   - No code changes needed!

---

## 🎯 Summary

**Railway PostgreSQL = New Database**
- You migrate your local data to Railway
- Railway manages the database
- Production-ready and secure

**External Database = Your Existing Database**
- Connect directly using `DATABASE_URL`
- You manage the database
- More control but more responsibility

**Which to Choose?**
- **New project or small app:** Use Railway PostgreSQL (easier)
- **Existing production DB:** Connect external (if already set up)
- **Learning/testing:** Use Railway PostgreSQL (free tier available)

---

**Need help with migration? Check Railway logs after connecting!**

