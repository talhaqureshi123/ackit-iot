# Railway Environment Variables Checklist

## ✅ Currently Set (from screenshot)
- `DATABASE_PUBLIC_URL` ✅
- `DATABASE_URL` ✅
- `JWT_SECRET` ✅
- `JWT_EXPIRES_IN` ✅
- `JWT_REFRESH_EXPIRES_IN` ✅
- `NODE_ENV` ✅
- `EMAIL_*` variables ✅
- `IOTIFY_NOTIFICATION_EMAIL` ✅

## ⚠️ Missing/Recommended Variables

### 1. SESSION_SECRET (Recommended for Production)
**Current Status:** Has fallback in code, but should be set explicitly for production security

**Add in Railway:**
```
SESSION_SECRET=<generate-a-random-secret-32-chars-min>
```

**Generate secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. PORT (Optional - Railway sets this automatically)
Railway automatically sets PORT, but you can override if needed.

## 🔍 Code Analysis

### JWT Secrets
- ✅ All roles (admin, superadmin, manager) use **same** `JWT_SECRET`
- ✅ No separate secrets needed
- ✅ Your current `JWT_SECRET` is sufficient

### Session Configuration
- Uses `SESSION_SECRET` with fallback
- Should set explicitly for production

### Database
- ✅ `DATABASE_URL` or `DATABASE_PUBLIC_URL` is set
- ✅ Code handles both

## 🐛 Admin Login 500 Error - Debugging Steps

The 500 error is likely caused by:

1. **Database Connection Issue**
   - Check Railway logs for database connection errors
   - Verify `DATABASE_URL` is correct

2. **Missing Model/Table**
   - Check if `Admin` table exists
   - Verify migrations ran successfully

3. **Bcrypt Error**
   - Check if password field is null in database
   - Verify password hash format

4. **Session Store Error**
   - Check if PostgreSQL session store is working
   - Verify session table exists

## 📋 Quick Fix Checklist

1. ✅ Add `SESSION_SECRET` to Railway variables
2. ✅ Check Railway logs for exact 500 error message
3. ✅ Verify database connection is working
4. ✅ Check if Admin table has the email `usman.abid00321@gmail.com`
5. ✅ Verify password hash exists and is valid bcrypt format

## 🔐 Security Note

**IMPORTANT:** The fallback `SESSION_SECRET` in code is:
```
"AADFDDDDDDDDDDDDDDD342332436737WQWEWQASDD"
```

This should be changed to a random secret in production!

