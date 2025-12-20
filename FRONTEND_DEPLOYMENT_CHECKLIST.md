# Frontend Deployment Checklist

## ✅ Frontend URL
**Your Frontend URL:** `https://ackit-iot-production-9ffb.up.railway.app`

## 📋 Required Steps

### 1. Frontend Service - Environment Variables

Railway Frontend Service → Variables tab mein yeh add karein:

```bash
VITE_RAILWAY_BACKEND_URL=https://ackit-iot-production.up.railway.app
NODE_ENV=production
```

### 2. Backend Service - Update CORS

Backend Service → Variables tab mein check/update karein:

```bash
FRONTEND_URL=https://ackit-iot-production-9ffb.up.railway.app
```

**Important:** Backend CORS configuration mein Railway frontend URLs automatically allow hote hain, lekin `FRONTEND_URL` variable set karna best practice hai.

### 3. Backend Service - Redeploy

After updating `FRONTEND_URL`:
- Backend service redeploy karein (CORS update ke liye)

### 4. Test Frontend

1. Browser mein open karein: `https://ackit-iot-production-9ffb.up.railway.app`
2. Login page dikhna chahiye
3. Login karke test karein:
   - API calls successful hain?
   - WebSocket connected hai?
   - Dashboard data load ho raha hai?

## 🔍 Verification

### Check API Calls:
- Browser Console → Network tab
- Login attempt ke time
- Requests should go to: `https://ackit-iot-production.up.railway.app/api`

### Check WebSocket:
- Browser Console
- Should see: `✅ WebSocket connected to backend`
- WebSocket URL: `wss://ackit-iot-production.up.railway.app/frontend`

### Check Cookies:
- Browser Console → Application → Cookies
- `ackit.sid` cookie present honi chahiye after login

## 🆘 If Issues

### CORS Errors:
- Backend `FRONTEND_URL` variable check karein
- Backend service redeploy karein

### 401 Unauthorized:
- Cookies properly set ho rahi hain?
- Browser console mein check karein

### WebSocket Not Connecting:
- Backend WebSocket endpoint check: `/frontend`
- Railway backend logs check karein

---

**Frontend URL:** `https://ackit-iot-production-9ffb.up.railway.app`
**Backend URL:** `https://ackit-iot-production.up.railway.app`

