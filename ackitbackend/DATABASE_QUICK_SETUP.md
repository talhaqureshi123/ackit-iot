# PostgreSQL Database Quick Setup on Railway

## 🚀 Quick Steps (5 minutes)

### Step 1: Add PostgreSQL
1. Railway Dashboard → Your Project
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Wait 1-2 minutes for database to initialize

### Step 2: Verify Connection
1. Go to your **Backend Service** → **"Variables"** tab
2. Check that `DATABASE_URL` exists (Railway adds it automatically)
3. If missing, copy from **Postgres Service** → **"Variables"** → `DATABASE_URL`

### Step 3: Deploy & Test
1. Deploy your backend (Railway auto-deploys on push)
2. Check **Logs** tab for: `✅ Database connection established successfully.`
3. Test: `https://your-service.railway.app/health`

## ✅ That's It!

Your database is connected. Railway automatically:
- ✅ Creates the database
- ✅ Shares `DATABASE_URL` with your backend
- ✅ Handles SSL/security
- ✅ Provides connection pooling

## 🔧 Need to Run Migrations?

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run migrations
railway run node migrations/run-migration.js
```

## 📊 View Your Database

- **Railway Dashboard:** Postgres Service → **"Data"** tab
- **CLI:** `railway connect postgres`
- **External Tool:** Use `DATABASE_URL` from Railway

## 🆘 Troubleshooting

**Database not connecting?**
- Check `DATABASE_URL` exists in backend Variables
- Verify Postgres service is running (green status)
- Check logs for connection errors

**Need more details?**
- See [RAILWAY_DATABASE_SETUP.md](./RAILWAY_DATABASE_SETUP.md) for complete guide

---

**Quick Reference:**
- Database Service: Railway Dashboard → Postgres
- Connection String: Postgres Service → Variables → `DATABASE_URL`
- Backend Config: Already done! Your code uses `DATABASE_URL` automatically

