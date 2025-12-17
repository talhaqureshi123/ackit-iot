# Event System Testing

## Overview
This testing suite verifies all event system functionality including:
- Event creation (device state unchanged)
- Event start (device turns ON)
- Event end (device turns OFF)
- Power failure recovery
- Auto scheduler functionality

## Running Tests

### Run All Tests
```bash
cd ackitbackend
node tests/eventSystem.test.js
```

### Run Individual Tests
```javascript
const { testEventCreateDeviceStateUnchanged } = require('./tests/eventSystem.test');

testEventCreateDeviceStateUnchanged();
```

## Test Cases

### 1. Event Create - Device State Unchanged ✅
- **Purpose**: Verify device state (ON/OFF) remains unchanged when event is created
- **Expected**: Device state before = Device state after
- **Checks**: 
  - Device `isOn` property unchanged
  - Temperature is set correctly

### 2. Event Start - Device Turns ON ✅
- **Purpose**: Verify device turns ON when event starts
- **Expected**: Device `isOn` = true after event start
- **Checks**:
  - Device state changes to ON
  - Temperature is applied

### 3. Event End - Device Turns OFF ✅
- **Purpose**: Verify device turns OFF when event ends
- **Expected**: Device `isOn` = false after event end
- **Checks**:
  - Device state changes to OFF
  - Event status changes to stopped/completed

### 4. Power Failure Recovery ✅
- **Purpose**: Verify event continues after power failure recovery
- **Expected**: Event remains active, device should maintain ON state
- **Checks**:
  - Active event exists after power recovery
  - Event temperature is maintained

### 5. Manager Event Create - Device State Unchanged ✅
- **Purpose**: Verify manager events also don't change device state on creation
- **Expected**: Device state unchanged (same as admin events)
- **Checks**:
  - Device state remains same
  - Temperature is set

### 6. Event Scheduler - Auto Start ✅
- **Purpose**: Verify scheduler automatically starts events at startTime
- **Expected**: Event status changes to "active", device turns ON
- **Checks**:
  - Scheduler detects scheduled events
  - Events auto-start correctly

### 7. Event Scheduler - Auto End ✅
- **Purpose**: Verify scheduler automatically ends events at endTime
- **Expected**: Event status changes to "completed"/"stopped", device turns OFF
- **Checks**:
  - Scheduler detects active events past endTime
  - Events auto-end correctly

## Prerequisites

Before running tests, ensure:
1. Database is set up and connected
2. Test devices exist in database
3. Admin and Manager accounts exist
4. Event scheduler is not running (to avoid conflicts)

## Mock Data

Update these constants in the test file:
- `mockAdminId`: Admin ID for testing
- `mockManagerId`: Manager ID for testing
- `mockDeviceId`: Device ID for testing

## Notes

- Tests create actual database records (clean up after testing)
- Tests may fail if devices/managers/admins don't exist
- Power failure recovery test simulates the scenario (doesn't require actual power failure)

