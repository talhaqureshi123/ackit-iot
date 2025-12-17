# Remote Lock Testing Guide

## Overview
This guide explains how to test the remote lock functionality in the ACKit system.

## Test Script: `test-remote-lock.js`

### Prerequisites
1. Backend server must be running on port 5050
2. Admin account must exist
3. Manager account must exist (optional, for manager lock tests)
4. At least one AC device must exist in the system

### Configuration
Before running the test, update the credentials in `test-remote-lock.js`:

```javascript
const BASE_URL = "http://localhost:5050";
const ADMIN_EMAIL = "your-admin@email.com";
const ADMIN_PASSWORD = "your-admin-password";
const MANAGER_EMAIL = "your-manager@email.com";
const MANAGER_PASSWORD = "your-manager-password";
```

### Running the Test

```bash
cd ackitbackend
node test-remote-lock.js
```

### What the Test Does

1. **Authentication**: Logs in as Admin and Manager
2. **Initial Status Check**: Checks current system lock status
3. **Admin Remote Lock**: Tests admin's ability to lock remote access
4. **Status After Lock**: Verifies lock was created
5. **Remote Control Blocking**: Tests that temperature changes work correctly
6. **Unlock Test**: Tests unlocking the system
7. **Manager Remote Lock** (if manager logged in): Tests manager's ability to lock remote access
8. **Final Status Check**: Verifies system is unlocked

### Expected Results

#### When System is Locked:
- ✅ Admin can still change temperatures (admin override)
- ⚠️ Manager temperature changes may be blocked (if admin locked)
- 🔒 Remote control (IR remote) changes are blocked and reverted
- 📱 Local control (device buttons) still works

#### When System is Unlocked:
- ✅ All users can change temperatures
- ✅ Remote control works normally
- ✅ Local control works normally

## Testing with ESP32 Simulator

To test remote control blocking with the ESP32 simulator:

1. **Start the backend server**:
   ```bash
   cd ackitbackend
   npm run dev
   ```

2. **Run the remote lock test**:
   ```bash
   node test-remote-lock.js
   ```

3. **In another terminal, start the ESP32 simulator**:
   ```bash
   node test-esp-simulator.js
   ```

4. **Test remote control blocking**:
   - In the ESP32 simulator, use: `remotetemp 24`
   - If system is locked, the temperature change should be blocked/reverted
   - The simulator will show: "REMOTE_CONTROL_BLOCKED" alert

5. **Test local control**:
   - In the ESP32 simulator, use: `temp 24`
   - This should work even when system is locked (local control)

## Understanding Remote Lock

### What Remote Lock Does:
- 🔒 Blocks remote control (IR remote) from changing temperatures
- ✅ Allows local control (device buttons) to work normally
- ✅ Allows admin to override and change temperatures
- ⚠️ May block manager temperature changes (if admin locked)

### What Remote Lock Does NOT Do:
- ❌ Does NOT lock manager accounts
- ❌ Does NOT lock AC devices
- ❌ Does NOT lock organizations
- ❌ Does NOT lock venues

### Lock Types:

1. **Admin Remote Lock** (`lock_from_remote`):
   - Admin locks remote access
   - Managers remain unlocked
   - Devices remain unlocked
   - Only remote control is blocked

2. **Manager Remote Lock** (`lock_from_remote`):
   - Manager locks remote access
   - Manager account remains unlocked
   - Devices remain unlocked
   - Only remote control is blocked

3. **Full System Lock** (`lock_from_admin`):
   - Locks managers
   - Locks devices
   - Blocks all remote access
   - This is different from remote lock!

## Troubleshooting

### Test Fails with "Login Failed"
- Check credentials in `test-remote-lock.js`
- Verify admin/manager accounts exist in database
- Check backend server is running

### Test Fails with "No ACs Found"
- Create at least one AC device in the system
- Verify AC is assigned to an organization
- Check organization is assigned to admin

### Remote Control Not Blocked
- Verify system is actually locked (check status)
- Check ESP32 simulator is sending `remote: true`
- Verify backend is processing lock checks correctly

## API Endpoints Tested

- `POST /admin/lock/from-remote` - Admin remote lock
- `POST /manager/lock/from-remote` - Manager remote lock
- `POST /admin/unlock` - Admin unlock
- `POST /manager/unlock` - Manager unlock
- `GET /admin/system/status` - System status (admin)
- `GET /manager/system/status` - System status (manager)
- `PATCH /admin/acs/:acId/temperature` - Set AC temperature (admin)
- `PATCH /manager/acs/:acId/temperature` - Set AC temperature (manager)

## Notes

- Remote lock only affects remote control (IR remote)
- Local control (device buttons) always works
- Admin can always override locks
- Manager can unlock if they have permission
- Lock state is stored in `SystemState` table
- Lock state is sent to ESP32 devices via WebSocket

