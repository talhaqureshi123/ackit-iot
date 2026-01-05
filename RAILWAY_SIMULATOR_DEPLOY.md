# 🚀 Railway Simulator Deployment Guide

## 📋 Simulator Overview

**File:** `ackitbackend/test-esp-simulator.js`

यह simulator ESP32 device को simulate करता है और backend से WebSocket के जरिए connect होता है।

## ✅ Railway में Deploy करें

### Option 1: Separate Railway Service (Recommended)

#### Step 1: New Service Create करें
1. Railway Dashboard → Your Project
2. **"New"** → **"Empty Service"**
3. Service name: `ackit-simulator`

#### Step 2: GitHub Repository Connect करें
1. **"Connect GitHub Repo"**
2. Same repository select करें (`ackit-iot`)
3. **Root Directory:** `ackitbackend`

#### Step 3: Build Settings
1. **Settings** → **Build**
2. **Build Command:** (leave empty - Railway auto-detects)
3. **Start Command:** `npm run simulator`

#### Step 4: Environment Variables Set करें
**Settings** → **Variables** में add करें:

```
NODE_ENV=production
DATABASE_URL=<same as backend>
RAILWAY_BACKEND_URL=https://ackit-iot-production.up.railway.app
USE_RAILWAY=true
```

**Database variables (same as backend):**
- `DATABASE_URL` (copy from backend service)
- `JWT_SECRET` (copy from backend)
- `SESSION_SECRET` (copy from backend)
- `BCRYPT_SALT_ROUNDS` (copy from backend)

#### Step 5: Deploy
1. **"Deploy"** button click करें
2. Simulator automatically start होगा

### Option 2: Same Service में Run (Background Process)

अगर same service में run करना है:

1. Backend service में **Settings** → **Variables**
2. Add: `RUN_SIMULATOR=true`
3. Backend `server.js` में simulator start करें (code modification needed)

## 🔍 Verify Simulator Running

**Railway Logs में यह दिखेगा:**
```
📋 Simulator Configuration:
   └─ Mode: 🚂 Railway (Production)
   └─ Server IP: https://ackit-iot-production.up.railway.app
   └─ Server Port: 443 (WSS)
   └─ WebSocket Path: /esp32
   └─ Serial Number: AC-919834-359
   └─ Full URL: wss://ackit-iot-production.up.railway.app/esp32

🔌 Attempting to connect to: wss://ackit-iot-production.up.railway.app/esp32
✅ WebSocket connection established!
```

## 📝 Package.json Script

**Added:**
```json
"simulator": "node test-esp-simulator.js"
```

**Run locally:**
```bash
npm run simulator
```

**Run on Railway:**
```bash
railway run npm run simulator
```

## ⚙️ Configuration

Simulator automatically:
- ✅ Railway mode detect करता है (if `RAILWAY_BACKEND_URL` set है)
- ✅ WSS (secure WebSocket) use करता है
- ✅ Backend से connect होता है
- ✅ Device state sync करता है

## 🎯 Quick Setup Checklist

- [ ] Create new Railway service: `ackit-simulator`
- [ ] Connect GitHub repository
- [ ] Set root directory: `ackitbackend`
- [ ] Set start command: `npm run simulator`
- [ ] Add environment variables (DATABASE_URL, RAILWAY_BACKEND_URL, etc.)
- [ ] Deploy service
- [ ] Check logs for connection status

## 🔧 Troubleshooting

**Simulator not connecting:**
1. Check `RAILWAY_BACKEND_URL` is correct
2. Check backend WebSocket server is running
3. Check logs for connection errors

**Database connection errors:**
1. Verify `DATABASE_URL` is set correctly
2. Check database is accessible from simulator service

## 📊 Monitoring

**Railway Dashboard में:**
- Service logs देखें
- Connection status check करें
- WebSocket messages monitor करें

## ✅ Success Indicators

- ✅ "WebSocket connection established!" log
- ✅ Device state syncing
- ✅ Commands receiving from backend
- ✅ Room temperature updates

