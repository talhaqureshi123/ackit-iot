# Railway Database Initialize - Step by Step

## 🚀 Kahan Se Run Karein

### Option 1: Local Terminal/Command Prompt Se (Recommended)

**Windows PowerShell ya CMD mein:**

#### Step 1: Railway CLI Install Karein

```powershell
npm i -g @railway/cli
```

#### Step 2: Project Folder Mein Jao

```powershell
cd C:\ackitfull\ackitbackend
```

#### Step 3: Railway Login Karein

```powershell
railway login
```

- Browser open hoga
- Railway account se login karein
- Authorization approve karein

#### Step 4: Project Link Karein

```powershell
railway link
```

- Apna Railway project select karein
- Service select karein (`ackit-iot`)

#### Step 5: Database Initialize Karein

```powershell
railway run node migrations/init-database.js
```

**Ya:**

```powershell
railway run npm run init-db
```

---

### Option 2: Railway Dashboard Se (One-Click Deploy)

**Agar Railway CLI install nahi karna chahte:**

1. **Railway Dashboard** → **Backend Service** → **Settings**
2. **"Deploy Command"** section mein:
   - Add: `node migrations/init-database.js`
   - Save
3. **Deployments** → **"Redeploy"**
4. **After deployment**, deploy command remove karein (normal start command wapas set karein)

---

### Option 3: Railway CLI Se Direct (Without Link)

**Agar project already linked hai:**

```powershell
# Direct run (project already linked)
cd C:\ackitfull\ackitbackend
railway run node migrations/init-database.js
```

---

## 📋 Complete Commands (Copy-Paste)

**Windows PowerShell:**

```powershell
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Navigate to backend folder
cd C:\ackitfull\ackitbackend

# 3. Login to Railway
railway login

# 4. Link project (first time only)
railway link

# 5. Initialize database
railway run node migrations/init-database.js
```

---

## ✅ Success Check

**After running, you should see:**

```
✅ Database connection established.
📊 Creating tables from models...
✅ Database schema initialized successfully!
```

**Railway Logs mein:**

- No more `relation "events" does not exist` errors
- App successfully running

---

## 🆘 Troubleshooting

### "railway: command not found"

- Railway CLI install nahi hai
- Run: `npm i -g @railway/cli`

### "Not logged in"

- Run: `railway login`

### "No project linked"

- Run: `railway link`
- Select your Railway project

### "Cannot find module"

- Make sure you're in `ackitbackend` folder
- Run: `cd C:\ackitfull\ackitbackend`

---

## 🎯 Quick Reference

**Location:** Local terminal (PowerShell/CMD)  
**Folder:** `C:\ackitfull\ackitbackend`  
**Command:** `railway run node migrations/init-database.js`

---

**Sabse easy: PowerShell mein commands copy-paste karein!** ✅
