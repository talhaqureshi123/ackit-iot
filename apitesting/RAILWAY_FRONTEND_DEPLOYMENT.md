# Frontend Deployment on Railway - Complete Guide

## 🎯 Overview

Yeh guide aapko Railway par frontend deploy karne mein help karega. Aapka backend already Railway par hai, ab frontend bhi Railway par deploy karein.

## 📋 Prerequisites

- ✅ Railway account (already have - backend deployed hai)
- ✅ GitHub repository (code already push ho chuka hai)
- ✅ Backend Railway URL (already configured)

## 🚀 Step-by-Step Deployment

### Step 1: Railway Project Mein Frontend Service Add Karein

1. **Railway Dashboard** mein jao: [railway.app](https://railway.app)
2. Apna existing project open karein (jisme backend hai)
3. **"+ New"** button click karein
4. **"GitHub Repo"** select karein
5. Apna repository select karein (`ackit-iot` ya jo bhi hai)

### Step 2: Service Configuration

1. **Service Name:** `frontend` ya `ackit-frontend` (optional)
2. **Root Directory:** `apitesting` set karein
   - Service → Settings → Source → Root Directory
   - Value: `apitesting`

### Step 3: Environment Variables Set Karein

Service → Variables tab mein yeh variables add karein:

#### Required Variables:

```bash
# Backend URL (Railway backend service URL)
VITE_RAILWAY_BACKEND_URL=https://ackit-iot-production.up.railway.app

# Node Environment
NODE_ENV=production

# Port (Railway automatically provides PORT, but set karna safe hai)
PORT=3000
```

**Important:** 
- `VITE_RAILWAY_BACKEND_URL` mein apna actual Railway backend URL dalo
- Agar backend URL different hai, to woh use karo

### Step 4: Build Configuration

Railway automatically detect karega:
- ✅ `nixpacks.toml` already hai (Node.js 18 configured)
- ✅ `package.json` mein build script hai
- ✅ Start command: `npm start` (serve package use karega)

**Verify:**
- Settings → Build → Build Command: `npm run build` (auto-detected)
- Settings → Deploy → Start Command: `npm start` (auto-detected)

### Step 5: Deploy

1. Railway automatically deploy start karega
2. **Deployments** tab mein progress check karein
3. Build logs check karein - koi error to nahi

### Step 6: Get Frontend URL

1. Deploy complete hone ke baad
2. Service → Settings → Domains
3. Railway automatically generate karega: `https://your-frontend.railway.app`
4. Ya custom domain add kar sakte ho

### Step 7: Update Backend CORS (Important!)

Backend service mein `FRONTEND_URL` variable update karein:

1. **Backend Service** → Variables
2. `FRONTEND_URL` variable add/update karein:
   ```bash
   FRONTEND_URL=https://your-frontend.railway.app
   ```
3. Backend service redeploy karein (CORS update ke liye)

## ✅ Verification

### 1. Frontend URL Check:
- Browser mein frontend URL open karein
- Login page dikhna chahiye

### 2. API Connection Check:
- Browser Console → Network tab
- Login attempt ke time API calls check karein
- Requests should go to: `https://your-backend.railway.app/api`

### 3. WebSocket Connection:
- Login ke baad dashboard open karein
- Console mein check: `✅ WebSocket connected to backend`
- WebSocket URL: `wss://your-backend.railway.app/frontend`

## 🔧 Configuration Files

### nixpacks.toml (Already Configured)
```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### package.json (Already Configured)
```json
{
  "scripts": {
    "build": "vite build",
    "start": "serve -s dist -l $PORT"
  }
}
```

## 🆘 Troubleshooting

### Build Fails:

**Error: "serve command not found"**
- Fix: `serve` package already hai `package.json` dependencies mein
- Agar nahi hai, to add karo: `npm install serve --save`

**Error: "Root Directory not found"**
- Fix: Root Directory `apitesting` set karein
- Service → Settings → Source → Root Directory

### Frontend Loads But API Calls Fail:

**CORS Errors:**
- Backend `FRONTEND_URL` variable check karein
- Frontend URL backend CORS mein allow hona chahiye

**401 Unauthorized:**
- Session cookies properly set ho rahi hain?
- Browser console mein cookies check karein
- `ackit.sid` cookie present honi chahiye

### WebSocket Not Connecting:

**Error: "WebSocket connection failed"**
- Backend WebSocket endpoint check: `/frontend`
- Railway backend logs check karein
- WebSocket URL: `wss://your-backend.railway.app/frontend`

## 📝 Quick Checklist

- [ ] Railway project mein frontend service add kiya
- [ ] Root Directory `apitesting` set kiya
- [ ] `VITE_RAILWAY_BACKEND_URL` variable set kiya (backend URL)
- [ ] `NODE_ENV=production` set kiya
- [ ] Build successful hua
- [ ] Frontend URL mil gaya
- [ ] Backend `FRONTEND_URL` variable update kiya
- [ ] Backend redeploy kiya (CORS update ke liye)
- [ ] Frontend se login test kiya
- [ ] API calls successful hain
- [ ] WebSocket connected hai

## 🎉 After Deployment

1. **Frontend URL:** `https://your-frontend.railway.app`
2. **Backend URL:** `https://your-backend.railway.app`
3. **Both services Railway par running hain!**

## 📚 Additional Notes

### Environment Variables Priority:

Frontend code mein environment variables kaise load hote hain:
1. Railway Variables (production)
2. `.env` file (local development)
3. Default values

### Production vs Development:

- **Development:** Vite dev server with proxy
- **Production:** Built static files served by `serve` package

### Custom Domain:

Agar custom domain chahiye:
1. Service → Settings → Domains
2. "Custom Domain" add karein
3. DNS settings configure karein

---

**Frontend ab Railway par deploy ho jayega!** 🚀

