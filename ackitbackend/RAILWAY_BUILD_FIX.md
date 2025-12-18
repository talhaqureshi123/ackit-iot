# Railway Build Fix - nodejs-20_x Error

## 🚨 Problem
Railway build logs show it's still trying to use `nodejs-20_x` even though `nixpacks.toml` has `nodejs-18_x`.

## ✅ Solution Steps

### Step 1: Verify Root Directory
1. Go to Railway Dashboard → Your Service → **Settings**
2. Under **"Source"**, check **Root Directory**
3. Should be set to: `ackitbackend`
4. If not, set it and save

### Step 2: Force Rebuild
1. Go to **Deployments** tab
2. Click **"Redeploy"** or **"Deploy Latest"**
3. This will force Railway to rebuild with latest code

### Step 3: Clear Cache (if needed)
If rebuild still shows `nodejs-20_x`:
1. Go to Service → **Settings**
2. Look for **"Clear Build Cache"** option
3. Clear cache and redeploy

### Step 4: Verify nixpacks.toml Location
Railway should detect `nixpacks.toml` from:
- `ackitbackend/nixpacks.toml` (if Root Directory is `ackitbackend`)
- OR root `nixpacks.toml` (if Root Directory is not set)

## 🔍 Current Status
- ✅ Local file: `nodejs-18_x` ✓
- ✅ Git repository: `nodejs-18_x` ✓
- ❌ Railway build: Still showing `nodejs-20_x` (needs rebuild)

## 📝 Alternative: Use Railway's Node.js Detection
If nixpacks.toml still doesn't work, Railway can auto-detect Node.js version from:
- `package.json` → `engines.node` field
- Or remove `nixpacks.toml` and let Railway auto-detect

### Add to package.json:
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

---

**After fixing, Railway should build successfully with Node.js 18!**

