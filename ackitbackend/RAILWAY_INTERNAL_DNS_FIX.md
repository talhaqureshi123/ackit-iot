# Railway Internal DNS Fix - ENOTFOUND postgres.railway.internal

## 🚨 Problem

Error: `getaddrinfo ENOTFOUND postgres.railway.internal`

**Cause:** Railway internal hostname resolve nahi ho raha. Internal URL (`postgres.railway.internal`) kabhi-kabhi kaam nahi karta.

## ✅ Quick Fix - Railway Dashboard Mein

### Step 1: Postgres Service Se Public URL Lein

1. **Railway Dashboard** → **Postgres Service** → **Variables** tab
2. **`DATABASE_PUBLIC_URL`** dhundhein
3. **Eye icon** click karein (reveal value)
4. **Copy icon** click karein (copy value)

**Format:**
```
postgresql://postgres:PASSWORD@containers-xxx.railway.app:5432/railway
```

### Step 2: Backend Service Mein Add Karein

**Option A: DATABASE_PUBLIC_URL Add Karein (Recommended)**

1. **Backend Service** (`ackit-iot`) → **Variables** tab
2. **"+ New Variable"** click karein
3. **Name:** `DATABASE_PUBLIC_URL`
4. **Value:** Postgres service se copy kiya hua `DATABASE_PUBLIC_URL` paste karein
5. **"Add"** click karein

**Option B: DATABASE_URL Ko Replace Karein**

1. **Backend Service** → **Variables** tab
2. **`DATABASE_URL`** find karein
3. **Edit** (pencil icon) click karein
4. **Value:** Postgres service se `DATABASE_PUBLIC_URL` ka value paste karein
   - Remove: `postgres.railway.internal`
   - Use: `containers-xxx.railway.app` (public URL)
5. **Save** karein

### Step 3: Verify

**After adding/updating:**
- Railway automatically redeploy karega
- Wait for deployment to complete

### Step 4: Check Logs

**Should see:**
```
✅ Using DATABASE_PUBLIC_URL from Railway
Database URL: postgresql://postgres:****@containers-xxx.railway.app:5432/railway
✅ Database connection established successfully.
```

**Should NOT see:**
```
❌ getaddrinfo ENOTFOUND postgres.railway.internal
```

## 🔍 Difference

| URL Type | Hostname | Works? |
|----------|----------|--------|
| **Internal** | `postgres.railway.internal` | ❌ Sometimes fails |
| **Public** | `containers-xxx.railway.app` | ✅ Always works |

## 📋 Quick Checklist

- [ ] Postgres Service → Variables → `DATABASE_PUBLIC_URL` copy kiya
- [ ] Backend Service → Variables → `DATABASE_PUBLIC_URL` add kiya (ya `DATABASE_URL` update kiya)
- [ ] Railway redeployed
- [ ] Logs check kiye - successful connection dikh raha hai

## 🆘 Still Not Working?

1. **Verify Postgres Service Status:**
   - Should be "Online" (green)

2. **Check URL Format:**
   - Should start with `postgresql://`
   - Should have public hostname (not `.internal`)

3. **Try Manual Connection String:**
   - Postgres Variables se individual values lein:
     - `PGHOST` (public hostname)
     - `PGPORT`
     - `PGUSER`
     - `PGPASSWORD`
     - `PGDATABASE`
   - Format: `postgresql://PGUSER:PGPASSWORD@PGHOST:PGPORT/PGDATABASE`
   - Backend Variables mein add karein

---

**After fix, database connection successful hoga!** ✅

