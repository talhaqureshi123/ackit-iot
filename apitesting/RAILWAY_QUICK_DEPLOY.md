# Railway Frontend Deployment - Quick Reference

## 🚀 Fast Deployment Steps

### 1. Railway Dashboard
- Go to: [railway.app](https://railway.app)
- Open your existing project (where backend is deployed)

### 2. Add Frontend Service
- Click **"+ New"** → **"GitHub Repo"**
- Select your repository
- **Root Directory:** Set to `apitesting`

### 3. Set Environment Variables
Go to Service → Variables and add:

```bash
VITE_RAILWAY_BACKEND_URL=https://your-backend-url.railway.app
NODE_ENV=production
```

**Replace `your-backend-url` with your actual Railway backend URL!**

### 4. Deploy
- Railway automatically starts deployment
- Wait for build to complete
- Get your frontend URL from Settings → Domains

### 5. Update Backend CORS
- Go to **Backend Service** → Variables
- Add/Update: `FRONTEND_URL=https://your-frontend-url.railway.app`
- Redeploy backend service

## ✅ Done!

Your frontend is now live on Railway! 🎉

---

**Full detailed guide:** See `RAILWAY_FRONTEND_DEPLOYMENT.md`

