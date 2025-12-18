# Railway Quick Start Checklist

Follow these steps to deploy your backend to Railway:

## ✅ Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] Railway account created
- [ ] Email credentials ready (for notifications)

## 🚀 Deployment Steps

### 1. Create Railway Project
- [ ] Go to [railway.app](https://railway.app) → New Project
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your repository

### 2. Configure Service
- [ ] Set **Root Directory** to: `ackitbackend`
  - Service → Settings → Source → Root Directory

### 3. Add PostgreSQL Database
- [ ] Click "+ New" → Database → Add PostgreSQL
- [ ] Railway automatically creates `DATABASE_URL`

### 4. Set Environment Variables
Go to Service → Variables and add:

**Required:**
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` (generate: `openssl rand -hex 32`)
- [ ] `SESSION_SECRET` (generate: `openssl rand -hex 32`)
- [ ] `EMAIL_HOST=smtp.gmail.com`
- [ ] `EMAIL_PORT=587`
- [ ] `EMAIL_USER=your-email@gmail.com`
- [ ] `EMAIL_PASS=your-app-password`
- [ ] `EMAIL_FROM=noreply@ackit.com`
- [ ] `IOTIFY_NOTIFICATION_EMAIL=your-email@gmail.com`

**Recommended:**
- [ ] `FRONTEND_URL=https://your-frontend.railway.app` (update after frontend deployment)

### 5. Deploy
- [ ] Railway will auto-deploy on push (if connected to GitHub)
- [ ] Or click "Deploy" in Railway dashboard

### 6. Verify
- [ ] Check deployment logs for success
- [ ] Test: `https://your-service.railway.app/health`
- [ ] Check application logs for database connection

## 🔗 After Deployment

1. **Get your backend URL:**
   - Railway provides: `https://your-service.railway.app`
   - Or use custom domain if configured

2. **Update frontend:**
   - Point frontend API to Railway backend URL
   - Update `FRONTEND_URL` in Railway variables

3. **Test endpoints:**
   - Health: `/health`
   - API: `/api/superadmin`, `/api/admin`, `/api/manager`

## 📝 Notes

- Railway automatically provides: `PORT`, `DATABASE_URL`, `RAILWAY_PUBLIC_DOMAIN`
- WebSocket endpoints: `wss://your-service.railway.app/esp32` and `/frontend`
- All logs available in Railway dashboard → Logs tab

## 🆘 Troubleshooting

**Build fails?**
- Check Root Directory is set to `ackitbackend`
- Check Node version in `nixpacks.toml` (should be 20)

**Database connection fails?**
- Verify PostgreSQL service is running
- Check `DATABASE_URL` exists in Variables

**App crashes?**
- Check Logs tab for errors
- Verify all required environment variables are set

---

For detailed instructions, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

