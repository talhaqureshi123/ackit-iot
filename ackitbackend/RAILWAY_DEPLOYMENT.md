# Railway Deployment Guide for ACKit Backend

This guide will walk you through deploying your ACKit backend to Railway.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app))
2. GitHub account (if deploying from GitHub)
3. Your backend code ready in a Git repository

## Step 1: Prepare Your Repository

Your backend is already configured for Railway with:
- ✅ `nixpacks.toml` - Railway build configuration
- ✅ Database connection using `DATABASE_URL` (Railway provides this automatically)
- ✅ Port configuration using `PORT` environment variable
- ✅ CORS configured for Railway domains

## Step 2: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. **Connect Railway to GitHub:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub account
   - Select your repository (`ackitfull`)

2. **Configure the Service:**
   - Railway will detect your `nixpacks.toml` automatically
   - Set the **Root Directory** to `ackitbackend`:
     - Go to your service settings
     - Under "Settings" → "Source", set Root Directory to `ackitbackend`

3. **Add PostgreSQL Database:**
   - In your Railway project, click "+ New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will automatically create a `DATABASE_URL` environment variable

4. **Set Environment Variables:**
   - Go to your service → "Variables" tab
   - Add the following environment variables:

### Required Environment Variables

```bash
# Node Environment
NODE_ENV=production

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Session Secret (generate a strong random string)
SESSION_SECRET=your-super-secret-session-key-change-this-to-random-string

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@ackit.com

# Notification Email
IOTIFY_NOTIFICATION_EMAIL=your-notification-email@gmail.com

# Frontend URL (update with your frontend Railway URL after deployment)
FRONTEND_URL=https://your-frontend.railway.app

# Optional: Custom domain (if you set one up)
RAILWAY_PUBLIC_DOMAIN=your-custom-domain.com
```

**Note:** Railway automatically provides:
- `PORT` - The port your app should listen on
- `DATABASE_URL` - PostgreSQL connection string
- `RAILWAY_PUBLIC_DOMAIN` - Your Railway domain (if using Railway's domain)

### Option B: Deploy using Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Railway in your project:**
   ```bash
   cd ackitbackend
   railway init
   ```

4. **Add PostgreSQL Database:**
   ```bash
   railway add postgresql
   ```

5. **Set Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set JWT_SECRET=your-secret-key
   railway variables set SESSION_SECRET=your-session-secret
   # ... add all other variables
   ```

6. **Deploy:**
   ```bash
   railway up
   ```

## Step 3: Configure Your Service

### Root Directory Configuration

**IMPORTANT:** Make sure Railway knows your backend is in the `ackitbackend` folder:

1. Go to your service in Railway dashboard
2. Click on "Settings"
3. Under "Source", set **Root Directory** to: `ackitbackend`

### Port Configuration

Your app already reads `PORT` from environment variables, which Railway provides automatically. No action needed.

### Database Migrations

If you need to run database migrations:

1. **Using Railway CLI:**
   ```bash
   cd ackitbackend
   railway run npm run migrate  # if you have a migrate script
   ```

2. **Or connect to Railway database:**
   - Get your database connection string from Railway dashboard
   - Use it locally to run migrations

## Step 4: Verify Deployment

1. **Check Build Logs:**
   - Go to your service → "Deployments" tab
   - Click on the latest deployment
   - Check for any build errors

2. **Check Application Logs:**
   - Go to your service → "Logs" tab
   - Look for: `🚀 ACKit Backend Server running on 0.0.0.0:PORT`
   - Check for database connection success: `✅ Database connection established successfully.`

3. **Test Health Endpoint:**
   - Your Railway service URL will be: `https://your-service.railway.app`
   - Test: `https://your-service.railway.app/health`
   - Should return: `{"success":true,"message":"ACKit Backend Server is running",...}`

## Step 5: Update Frontend Configuration

After deployment, update your frontend to point to the Railway backend:

1. Get your Railway backend URL (e.g., `https://ackit-backend.railway.app`)
2. Update your frontend API configuration to use this URL
3. Update the `FRONTEND_URL` environment variable in Railway to match your frontend URL

## Troubleshooting

### Build Fails

- **Check Node version:** Your `nixpacks.toml` uses Node 18. If you need a different version, update it.
- **Check Root Directory:** Ensure Root Directory is set to `ackitbackend`
- **Check package.json:** Ensure `start` script exists: `"start": "node server.js"`

### Database Connection Fails

- **Check DATABASE_URL:** Railway should provide this automatically. Verify it exists in Variables.
- **Check SSL:** Your code already handles SSL for production. Ensure `NODE_ENV=production` is set.

### Application Crashes

- **Check Logs:** Go to "Logs" tab in Railway dashboard
- **Check Environment Variables:** Ensure all required variables are set
- **Check Port:** Ensure your app listens on `process.env.PORT` (Railway provides this)

### CORS Errors

- **Update CORS Origins:** Your code already includes Railway domain patterns
- **Set FRONTEND_URL:** Make sure `FRONTEND_URL` environment variable matches your frontend URL
- **Check RAILWAY_PUBLIC_DOMAIN:** This is automatically set by Railway

## Environment Variables Reference

| Variable | Required | Description | Railway Auto-Provided |
|----------|----------|-------------|----------------------|
| `NODE_ENV` | Yes | Set to `production` | No |
| `PORT` | Yes | Server port | ✅ Yes |
| `DATABASE_URL` | Yes | PostgreSQL connection string | ✅ Yes (if PostgreSQL added) |
| `JWT_SECRET` | Yes | Secret for JWT tokens | No |
| `SESSION_SECRET` | Yes | Secret for sessions | No |
| `EMAIL_HOST` | Yes | SMTP server host | No |
| `EMAIL_PORT` | Yes | SMTP server port | No |
| `EMAIL_USER` | Yes | SMTP username | No |
| `EMAIL_PASS` | Yes | SMTP password | No |
| `EMAIL_FROM` | Yes | Email sender address | No |
| `IOTIFY_NOTIFICATION_EMAIL` | Yes | Notification recipient email | No |
| `FRONTEND_URL` | Recommended | Frontend URL for CORS | No |
| `RAILWAY_PUBLIC_DOMAIN` | Optional | Custom domain | ✅ Yes (if using Railway domain) |

## Additional Notes

- **WebSocket Support:** Your app uses WebSocket for ESP32 connections. Railway supports WebSocket, but ensure your frontend connects using `wss://` (secure WebSocket) in production.
- **Session Store:** Your app uses PostgreSQL session store, which works perfectly with Railway's PostgreSQL.
- **Cron Jobs:** Your app uses `node-cron` for scheduled tasks. These will run automatically on Railway.

## Support

If you encounter issues:
1. Check Railway logs first
2. Verify all environment variables are set
3. Ensure Root Directory is correctly configured
4. Check that PostgreSQL service is running and connected

---

**Happy Deploying! 🚀**

