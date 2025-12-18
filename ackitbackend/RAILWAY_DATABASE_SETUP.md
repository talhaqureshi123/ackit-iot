# Railway PostgreSQL Database Setup Guide

This guide will walk you through setting up PostgreSQL database on Railway for your ACKit backend.

## Step 1: Add PostgreSQL Database to Railway

### Method 1: Using Railway Dashboard (Recommended)

1. **Go to your Railway Project:**
   - Log in to [railway.app](https://railway.app)
   - Open your project (or create a new one)

2. **Add PostgreSQL Database:**
   - Click the **"+ New"** button in your project
   - Select **"Database"** from the dropdown
   - Choose **"Add PostgreSQL"**
   - Railway will automatically create a PostgreSQL database service

3. **Wait for Database to Initialize:**
   - Railway will provision the database (takes 1-2 minutes)
   - You'll see a new service called "Postgres" in your project

## Step 2: Connect Database to Your Backend Service

### Automatic Connection (Railway Auto-Detects)

Railway automatically:
- ✅ Creates a `DATABASE_URL` environment variable
- ✅ Shares it with all services in the same project
- ✅ Your backend service will automatically receive it

### Verify Connection String

1. **Check Environment Variables:**
   - Go to your **backend service** (not the Postgres service)
   - Click on **"Variables"** tab
   - Look for `DATABASE_URL` - it should be automatically added
   - Format: `postgresql://postgres:PASSWORD@HOST:PORT/railway`

2. **If DATABASE_URL is Missing:**
   - Go to your **Postgres service**
   - Click on **"Variables"** tab
   - Find `DATABASE_URL` or `POSTGRES_URL`
   - Copy the value
   - Go to your **backend service** → **"Variables"** tab
   - Click **"+ New Variable"**
   - Name: `DATABASE_URL`
   - Value: Paste the connection string
   - Click **"Add"**

## Step 3: Database Connection Details

### View Database Credentials

1. **Go to Postgres Service:**
   - Click on your **Postgres** service in Railway
   - Go to **"Variables"** tab

2. **Available Variables:**
   - `DATABASE_URL` - Full connection string (use this)
   - `PGHOST` - Database host
   - `PGPORT` - Database port (usually 5432)
   - `PGUSER` - Database user (usually `postgres`)
   - `PGPASSWORD` - Database password
   - `PGDATABASE` - Database name (usually `railway`)

### Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Example:
```
postgresql://postgres:abc123xyz@containers-us-west-123.railway.app:5432/railway
```

## Step 4: Configure Your Backend

Your backend is already configured to use `DATABASE_URL`! 

The code in `config/database/postgresql.js` automatically:
- ✅ Detects `DATABASE_URL` from Railway
- ✅ Uses SSL in production
- ✅ Connects to the database on startup

**No code changes needed!**

## Step 5: Run Database Migrations

### Option 1: Using Railway CLI (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Link to Your Project:**
   ```bash
   cd ackitbackend
   railway link
   ```
   - Select your project and service

4. **Run Migrations:**
   ```bash
   # If you have a migrate script in package.json
   railway run npm run migrate
   
   # Or run a specific migration file
   railway run node migrations/run-migration.js
   ```

### Option 2: Connect Locally to Railway Database

1. **Get Connection String:**
   - Go to Postgres service → Variables
   - Copy `DATABASE_URL`
   - **Important:** Use the **PUBLIC** connection string (not internal) for local connection

2. **Set Local Environment Variable:**
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"
   
   # Windows CMD
   set DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/railway
   
   # Linux/Mac
   export DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"
   ```

3. **Run Migrations Locally:**
   ```bash
   cd ackitbackend
   node migrations/run-migration.js
   ```

### Option 3: Using Railway Database Tab

1. **Open Railway Database:**
   - Go to your Postgres service
   - Click on **"Data"** tab (or **"Query"** tab)
   - Railway provides a web-based SQL editor

2. **Run SQL Manually:**
   - You can run SQL queries directly
   - Useful for quick schema checks or data queries

## Step 6: Verify Database Connection

### Check Application Logs

1. **Deploy Your Backend:**
   - Railway will automatically deploy when you push to GitHub
   - Or manually trigger a deployment

2. **Check Logs:**
   - Go to your backend service → **"Logs"** tab
   - Look for: `✅ Database connection established successfully.`
   - If you see this, your database is connected!

### Test Connection Manually

1. **Using Railway CLI:**
   ```bash
   railway run node -e "require('./config/database/postgresql')"
   ```

2. **Check Health Endpoint:**
   - Visit: `https://your-service.railway.app/health`
   - If it returns success, your app (and database) is working

## Step 7: Database Management

### View Database Data

1. **Using Railway Dashboard:**
   - Go to Postgres service → **"Data"** tab
   - Browse tables and data

2. **Using Railway CLI:**
   ```bash
   railway connect postgres
   ```
   - Opens a PostgreSQL shell connected to your Railway database

3. **Using External Tool (pgAdmin, DBeaver, etc.):**
   - Get `DATABASE_URL` from Railway
   - Use it to connect with your preferred database tool
   - **Note:** You may need to whitelist your IP in Railway settings

### Backup Database

1. **Using Railway CLI:**
   ```bash
   railway run pg_dump $DATABASE_URL > backup.sql
   ```

2. **Using Railway Dashboard:**
   - Go to Postgres service → **"Settings"**
   - Look for backup options (if available in your plan)

### Restore Database

```bash
railway run psql $DATABASE_URL < backup.sql
```

## Troubleshooting

### Database Connection Fails

**Problem:** `❌ Unable to connect to the database`

**Solutions:**
1. **Check DATABASE_URL exists:**
   - Go to backend service → Variables
   - Verify `DATABASE_URL` is present
   - If missing, copy from Postgres service

2. **Check SSL Configuration:**
   - Your code already handles SSL for production
   - Ensure `NODE_ENV=production` is set

3. **Check Database Service Status:**
   - Go to Postgres service
   - Ensure it's running (green status)

4. **Check Connection String Format:**
   - Should start with `postgresql://`
   - Should include password, host, port, and database

### Migrations Fail

**Problem:** Migrations don't run or fail

**Solutions:**
1. **Check Database Connection:**
   - Verify `DATABASE_URL` is correct
   - Test connection first

2. **Check Migration Scripts:**
   - Ensure migration files are in `migrations/` folder
   - Check file permissions

3. **Run Migrations Manually:**
   - Use Railway CLI: `railway run node migrations/run-migration.js`
   - Or connect locally and run migrations

### Can't See Tables

**Problem:** Database connected but no tables visible

**Solutions:**
1. **Run Migrations:**
   - Your app needs to create tables
   - Run migration scripts

2. **Check Sequelize Sync:**
   - Your models should auto-create tables on first connection
   - Check logs for any errors

3. **Verify Database:**
   - Connect using Railway CLI: `railway connect postgres`
   - Run: `\dt` to list tables

## Database Connection String Types

Railway provides two types of connection strings:

### 1. Internal Connection (for Railway services)
- Format: `postgresql://...@postgres.railway.internal:5432/...`
- Use: For connections between Railway services
- Faster and more secure within Railway network

### 2. Public Connection (for external access)
- Format: `postgresql://...@containers-us-west-123.railway.app:5432/...`
- Use: For local development, external tools
- Accessible from outside Railway

**Your backend automatically uses the correct one!**

## Environment Variables Summary

After setting up PostgreSQL, your backend service should have:

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Auto from Postgres | Full connection string |
| `NODE_ENV` | You set | Should be `production` |
| `PORT` | Auto from Railway | Server port |
| `JWT_SECRET` | You set | JWT secret key |
| `SESSION_SECRET` | You set | Session secret |
| `EMAIL_*` | You set | Email configuration |

## Next Steps

After database is set up:

1. ✅ Verify connection in logs
2. ✅ Run database migrations
3. ✅ Test your API endpoints
4. ✅ Set up your frontend to connect to backend

## Quick Reference Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Connect to database
railway connect postgres

# Run migrations
railway run npm run migrate

# View logs
railway logs

# Check variables
railway variables
```

---

**Your database is now ready! 🎉**

For more help, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

