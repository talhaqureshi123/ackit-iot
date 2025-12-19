# Frontend Railway Setup - Complete Guide

## ✅ Railway Backend URL Set Kar Diya Gaya Hai!

Frontend ab Railway backend se connect hoga automatically.

## 📋 Configuration

### Environment Variable

`.env` file mein Railway backend URL set hai:
```
VITE_RAILWAY_BACKEND_URL=https://ackit-iot-production.up.railway.app
```

### Code Updates

1. ✅ **API Config** (`src/config/api.js`):
   - Railway URL support added
   - WebSocket URL automatically uses Railway URL

2. ✅ **WebSocket Connections**:
   - `AdminDashboard.jsx` - Updated
   - `ManagerDashboard.jsx` - Updated
   - Automatically uses Railway WebSocket URL

3. ✅ **Vite Proxy**:
   - Automatically proxies to Railway backend

## 🚀 How It Works

### Development (Local):
- Agar `.env` mein `VITE_RAILWAY_BACKEND_URL` nahi hai:
  - Uses local backend: `http://192.168.1.105:5050`
  - WebSocket: `ws://192.168.1.105:5050/frontend`

### Production (Railway):
- `.env` mein `VITE_RAILWAY_BACKEND_URL` set hai:
  - Uses Railway backend: `https://ackit-iot-production.up.railway.app`
  - WebSocket: `wss://ackit-iot-production.up.railway.app/frontend`

## 🔧 Update Railway Backend URL

Agar Railway backend URL change ho:

1. **Update `.env` file:**
   ```
   VITE_RAILWAY_BACKEND_URL=https://your-new-railway-url.railway.app
   ```

2. **Restart Vite dev server:**
   ```bash
   npm run dev
   ```

## ✅ Verification

### Check API Calls:
- Browser Console → Network tab
- API requests should go to: `https://ackit-iot-production.up.railway.app/api`

### Check WebSocket:
- Browser Console → Should see: `✅ WebSocket connected to backend`
- WebSocket URL: `wss://ackit-iot-production.up.railway.app/frontend`

## 🆘 Troubleshooting

### API Calls Fail:
- Check `.env` file exists
- Verify `VITE_RAILWAY_BACKEND_URL` is correct
- Restart Vite dev server

### WebSocket Not Connecting:
- Check Railway backend is running
- Verify WebSocket endpoint: `/frontend`
- Check browser console for errors

### CORS Errors:
- Railway backend CORS already configured
- Verify `FRONTEND_URL` in Railway Variables matches your frontend URL

---

**Frontend ab Railway backend se connect hoga!** ✅

