# Session Debugging Guide

## 🔍 Check Session Creation

### 1. Check Railway Backend Logs

After login, check Railway logs for:

```
✅ Session created for SuperAdmin
✅ Session saved successfully
✅ After save - Session data
```

### 2. Check Cookie Settings

**Production (Railway):**

- `secure: true` ✅ (HTTPS required)
- `sameSite: "none"` ✅ (Cross-origin)
- `httpOnly: true` ✅ (Security)

**Development (Local):**

- `secure: false` ✅ (HTTP allowed)
- `sameSite: "lax"` ✅ (Same-origin)
- `httpOnly: true` ✅ (Security)

### 3. Test Session Endpoint

**Using Browser Console:**

```javascript
// After login, test session
fetch("/api/test-session", {
  credentials: "include",
})
  .then((r) => r.json())
  .then((data) => console.log("Session test:", data));
```

**Using curl:**

```bash
# Get session cookie first (from browser DevTools → Application → Cookies)
curl -X GET https://ackit-iot-production.up.railway.app/api/test-session \
  -H "Cookie: ackit.sid=YOUR_SESSION_ID" \
  -H "Origin: http://localhost:3000" \
  -v
```

### 4. Check Frontend Cookie Settings

**In `apitesting/src/services/api.js`:**

- `withCredentials: true` ✅ (Required for cookies)

**In `apitesting/vite.config.js`:**

- Proxy should forward cookies ✅

### 5. Common Issues

#### Issue 1: Cookies Not Sent (Cross-Origin)

**Symptom:** Session created but not persisted
**Fix:**

- Backend: `sameSite: "none"` + `secure: true`
- Frontend: `withCredentials: true`
- CORS: `credentials: true`

#### Issue 2: Session Not Saved to Database

**Symptom:** Session works but lost on restart
**Check:**

```sql
-- Connect to Railway database
SELECT * FROM session ORDER BY expire DESC LIMIT 5;
```

#### Issue 3: Session Cookie Not Set

**Symptom:** No cookie in browser
**Check:**

- Browser DevTools → Application → Cookies
- Look for `ackit.sid`
- Check if domain matches

### 6. Debug Steps

1. **Login and check logs:**

   ```
   ✅ Session created for SuperAdmin
   ✅ Session saved successfully
   ```

2. **Check browser cookies:**

   - DevTools → Application → Cookies
   - Should see `ackit.sid` cookie

3. **Test session endpoint:**

   ```javascript
   fetch("/api/test-session", { credentials: "include" })
     .then((r) => r.json())
     .then(console.log);
   ```

4. **Check database:**
   ```sql
   SELECT sid, sess, expire FROM session WHERE expire > NOW();
   ```

### 7. Railway-Specific Issues

**If cookies not working on Railway:**

1. **Check CORS origins:**

   - Railway Dashboard → Variables
   - `CORS_ORIGINS` should include frontend URL

2. **Check session store:**

   - Logs should show: `✅ Using PostgreSQL session store`
   - NOT: `⚠️ PostgreSQL session store failed`

3. **Check environment:**
   - `NODE_ENV=production` ✅
   - `SESSION_SECRET` set ✅
   - `DATABASE_PUBLIC_URL` set ✅

### 8. Quick Fixes

**If session not persisting:**

1. **Clear browser cookies:**

   - DevTools → Application → Cookies → Clear all

2. **Restart backend:**

   - Railway Dashboard → Redeploy

3. **Check session table:**
   ```sql
   -- Railway CLI
   railway connect postgres
   SELECT COUNT(*) FROM session;
   ```

### 9. Expected Behavior

**After successful login:**

1. ✅ Session created in database
2. ✅ Cookie set in browser (`ackit.sid`)
3. ✅ Session data stored (`req.session.user`)
4. ✅ Subsequent requests include cookie
5. ✅ Session validated on each request

**If any step fails, check logs!**
