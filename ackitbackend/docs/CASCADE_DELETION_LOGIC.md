# Cascade Deletion Logic Documentation

## Overview
This document explains the cascade deletion logic for Venues, Organizations, and AC Devices.

## 1. VENUE DELETION FLOW

When a **Venue** is deleted:

```
VENUE (delete)
    ↓
┌─────────────────────────────────────────┐
│ 1. Find all Organizations in Venue      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ For EACH Organization:                  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ 2. Find all AC Devices in Org    │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │ 3. Delete Events:                │  │
│  │    - Events where deviceId = AC  │  │
│  │    - Events where orgId = Org    │  │
│  │    - Child events (parentAdmin)  │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │ 4. Delete ActivityLogs:          │  │
│  │    - targetType="ac", targetId   │  │
│  │    - targetType="org", targetId  │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │ 5. Delete SystemStates:          │  │
│  │    - entityType="ac", entityId   │  │
│  │    - entityType="org", entityId  │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │ 6. Delete AC Devices             │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │ 7. Handle split relationships    │  │
│  │    - Clear splitFromId           │  │
│  │    - Update splitIntoIds         │  │
│  └──────────────────────────────────┘  │
│           ↓                             │
│  ┌──────────────────────────────────┐  │
│  │ 8. Delete Organization           │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 9. Delete Venue ActivityLogs            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 10. Delete Venue                        │
└─────────────────────────────────────────┘
```

## 2. ORGANIZATION DELETION FLOW

When an **Organization** is deleted:

```
ORGANIZATION (delete)
    ↓
┌─────────────────────────────────────────┐
│ 1. Find all AC Devices in Organization  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 2. Find all Events:                     │
│    - Events where deviceId = AC IDs     │
│    - Events where organizationId = Org  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. Delete Events:                       │
│    - Events related to ACs              │
│    - Events related to Organization     │
│    - Child events (parentAdminEventId)  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. Delete ActivityLogs:                 │
│    - targetType="ac", targetId          │
│    - targetType="organization", targetId│
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 5. Delete SystemStates:                 │
│    - entityType="ac", entityId          │
│    - entityType="organization", entityId│
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 6. Delete AC Devices                    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 7. Handle split relationships:          │
│    - Clear splitFromId                  │
│    - Update splitIntoIds                │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 8. Delete Organization                  │
└─────────────────────────────────────────┘
```

## 3. AC DEVICE DELETION FLOW

When an **AC Device** is deleted (individual device):

```
AC DEVICE (delete)
    ↓
┌─────────────────────────────────────────┐
│ 1. Delete Events:                       │
│    - Events where deviceId = AC ID      │
│    - Child events (parentAdminEventId)  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 2. Delete ActivityLogs:                 │
│    - targetType="ac", targetId          │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. Delete SystemStates:                 │
│    - entityType="ac", entityId          │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. Delete AC Device                     │
└─────────────────────────────────────────┘
```

## Summary Table

| Deleted Entity | Deletes Related |
|----------------|----------------|
| **Venue** | → All Organizations → All ACs → All Events → All ActivityLogs → All SystemStates |
| **Organization** | → All ACs → All Events → All ActivityLogs → All SystemStates |
| **AC Device** | → All Events → All ActivityLogs → All SystemStates |

## Key Points

1. **Events are deleted when:**
   - Organization is deleted (events with that organizationId)
   - AC device is deleted (events with that deviceId)
   - Parent event is deleted (child events with parentAdminEventId)

2. **ActivityLogs are deleted when:**
   - Organization is deleted (logs with targetType="organization")
   - AC device is deleted (logs with targetType="ac")
   - Venue is deleted (logs with targetType="venue")

3. **SystemStates are deleted when:**
   - Organization is deleted (states with entityType="organization")
   - AC device is deleted (states with entityType="ac")

4. **All deletions are transactional:**
   - If any step fails, everything rolls back
   - Ensures data integrity


