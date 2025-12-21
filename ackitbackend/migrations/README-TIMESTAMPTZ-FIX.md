# Events Table TIMESTAMPTZ Migration Guide

## Problem
The `events` table was using `timestamp` (without timezone) columns, which caused timezone conversion issues. When storing UTC times, PostgreSQL would treat them as local times, leading to incorrect storage and retrieval.

## Solution
Convert all timestamp columns in the `events` table to `TIMESTAMPTZ` (timestamp with timezone) to properly handle UTC storage.

## Migration Steps

### Step 1: Check Current Column Types
Run this in Railway PostgreSQL console or your database client:

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('startTime', 'endTime', 'originalEndTime', 'startedAt', 'completedAt', 'stoppedAt', 'disabledAt')
ORDER BY column_name;
```

If you see `timestamp` (without timezone), proceed with the migration.

### Step 2: Run the Migration

**Option A: Using the migration runner script**
```bash
cd ackitbackend
node migrations/run-timestamptz-migration.js
```

**Option B: Using Railway CLI**
```bash
railway run node migrations/run-timestamptz-migration.js
```

**Option C: Manual SQL (if needed)**
```sql
-- Convert startTime
ALTER TABLE events
ALTER COLUMN "startTime"
TYPE TIMESTAMPTZ
USING "startTime" AT TIME ZONE 'Asia/Karachi';

-- Convert endTime
ALTER TABLE events
ALTER COLUMN "endTime"
TYPE TIMESTAMPTZ
USING "endTime" AT TIME ZONE 'Asia/Karachi';

-- Convert originalEndTime (if exists)
ALTER TABLE events
ALTER COLUMN "originalEndTime"
TYPE TIMESTAMPTZ
USING "originalEndTime" AT TIME ZONE 'Asia/Karachi';
```

### Step 3: Verify Migration
After running the migration, verify the column types:

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('startTime', 'endTime', 'originalEndTime')
ORDER BY column_name;
```

You should see `timestamp with time zone` (or `timestamptz`) for all columns.

### Step 4: Test Event Creation
1. Create an event at 4:58 PM PKT
2. Check the database:
   ```sql
   SELECT start_time, end_time FROM events ORDER BY id DESC LIMIT 1;
   ```
3. Expected result: `2025-12-21 11:58:00+00` (UTC)
4. UI should display: `4:58 PM` (PKT)

## How It Works Now

### Flow:
```
[User enters 4:58 PM PKT in form]
        ↓
Frontend converts to UTC → "2025-12-21T11:58:00.000Z"
        ↓
Backend receives UTC ISO string
        ↓
Backend creates Date object → new Date("2025-12-21T11:58:00.000Z")
        ↓
Sequelize stores in PostgreSQL TIMESTAMPTZ → 2025-12-21 11:58:00+00
        ↓
Frontend retrieves UTC ISO string → "2025-12-21T11:58:00.000Z"
        ↓
Frontend displays using toLocaleTimeString → "4:58 PM" (PKT)
```

### Key Changes:

1. **Database Columns**: Now `TIMESTAMPTZ` (stores UTC with timezone info)
2. **Backend**: Uses Date objects directly (no more `Sequelize.literal` with timestamp)
3. **Frontend**: Uses `toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })` for display

## Rollback (if needed)

If you need to rollback the migration:

```bash
node migrations/run-timestamptz-migration.js --rollback
```

Or manually:
```sql
ALTER TABLE events
ALTER COLUMN "startTime"
TYPE TIMESTAMP
USING "startTime" AT TIME ZONE 'UTC';

ALTER TABLE events
ALTER COLUMN "endTime"
TYPE TIMESTAMP
USING "endTime" AT TIME ZONE 'UTC';
```

⚠️ **Warning**: Rollback will lose timezone information and may cause timezone issues again.

## Notes

- The migration assumes existing data is in PKT (Asia/Karachi) timezone
- All new events will be stored in UTC
- Frontend always displays in PKT for user convenience
- Backend always works with UTC internally

