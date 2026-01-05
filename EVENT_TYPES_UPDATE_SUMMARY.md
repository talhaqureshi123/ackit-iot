# Event Types Update Summary

## ✅ Changes Made

### 1. **ESP32 Code (ESP32_AC_CONTROL.ino)** ✅
- Added `eventType` field to DeviceState struct (simple, recurring, device-power)
- Added `eventControlsPower` flag for device-power events
- Updated `handleEventStatus()` to handle all three event types:
  - **Simple Event**: Temperature control only
  - **Recurring Event**: Weekly recurring temperature control
  - **Device Power Event**: Device ON/OFF control (with optional temperature)

### 2. **Backend - Admin Event Service** ✅
- Updated `eventService.js` to send event type information to ESP32
- Added `eventType`, `controlDevicePower`, and `powerOn` fields to EVENT_STATUS messages

### 3. **Backend - Manager Event Service** ✅
- Updated `managerEventService.js` to send event type information to ESP32
- Added `eventType`, `controlDevicePower`, and `powerOn` fields to EVENT_STATUS messages

### 4. **Backend - Event Scheduler** ✅
- Updated `eventScheduler.js` to send event type information when events end
- Added `powerOff` flag for device-power events when event ends

---

## 📋 Three Event Types

### 1. Simple Event
- **Type**: `"simple"`
- **Purpose**: One-time temperature control
- **ESP32 Behavior**: Sets temperature, disables +/- buttons during event

### 2. Recurring Event
- **Type**: `"recurring"`
- **Purpose**: Weekly recurring temperature control
- **ESP32 Behavior**: Sets temperature on scheduled days/times, disables +/- buttons during event

### 3. Device Power Event
- **Type**: `"device-power"`
- **Purpose**: Device ON/OFF control (with optional temperature)
- **ESP32 Behavior**: 
  - Turns device ON/OFF at scheduled times
  - Optionally sets temperature if provided
  - Disables +/- buttons during event

---

## 🔧 ESP32 Event Handling

### Event Start (event created / event temp / enable)
```json
{
  "type": "EVENT_STATUS",
  "status": "event created",
  "eventId": 123,
  "eventName": "Morning Event",
  "temperature": 25,
  "eventType": "simple",  // or "recurring" or "device-power"
  "controlDevicePower": false,  // true for device-power events
  "powerOn": true  // for device-power events
}
```

### Event End (event end / disable / event stop)
```json
{
  "type": "EVENT_STATUS",
  "status": "event end",
  "eventId": 123,
  "eventName": "Morning Event",
  "temperature": 25,
  "eventType": "device-power",
  "controlDevicePower": true,
  "powerOff": true  // optionally turn off device when event ends
}
```

---

## ✅ Testing Checklist

- [ ] Create Simple Event → ESP32 receives event type "simple"
- [ ] Create Recurring Event → ESP32 receives event type "recurring"
- [ ] Create Device Power Event → ESP32 receives event type "device-power"
- [ ] Device Power Event turns device ON at scheduled time
- [ ] Device Power Event turns device OFF at scheduled time (if configured)
- [ ] All event types disable +/- buttons during active event
- [ ] All event types enable +/- buttons when event ends

---

## 📝 Notes

1. **Event Type Detection**: Backend determines event type from:
   - `isRecurring = true` → "recurring"
   - `controlDevicePower = true` → "device-power"
   - Otherwise → "simple"

2. **Device Power Events**: 
   - Can optionally include temperature
   - Control device ON/OFF at scheduled times
   - Can optionally turn device OFF when event ends

3. **Backward Compatibility**: 
   - If event type is not provided, ESP32 defaults to simple event behavior
   - Old events without event type will still work





