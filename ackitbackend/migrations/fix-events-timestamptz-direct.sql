-- ============================================
-- DIRECT SQL SCRIPT: Fix Events Timezone Issue
-- ============================================
-- Run this directly in Railway PostgreSQL Console
-- This converts timestamp columns to TIMESTAMPTZ
-- ============================================

-- Step 1: Check current column types (for verification)
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('startTime', 'endTime', 'originalEndTime', 'startedAt', 'completedAt', 'stoppedAt', 'disabledAt')
ORDER BY column_name;

-- Step 2: Convert startTime to TIMESTAMPTZ
-- CRITICAL: Using 'UTC' because backend already sends UTC times
ALTER TABLE events
ALTER COLUMN "startTime"
TYPE TIMESTAMPTZ
USING "startTime" AT TIME ZONE 'UTC';

-- Step 3: Convert endTime to TIMESTAMPTZ
ALTER TABLE events
ALTER COLUMN "endTime"
TYPE TIMESTAMPTZ
USING "endTime" AT TIME ZONE 'UTC';

-- Step 4: Convert originalEndTime to TIMESTAMPTZ (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'originalEndTime'
    ) THEN
        ALTER TABLE events
        ALTER COLUMN "originalEndTime"
        TYPE TIMESTAMPTZ
        USING "originalEndTime" AT TIME ZONE 'UTC';
    END IF;
END $$;

-- Step 5: Convert other timestamp columns (if they exist)
DO $$
BEGIN
    -- startedAt
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'startedAt'
        AND udt_name = 'timestamp'
    ) THEN
        ALTER TABLE events
        ALTER COLUMN "startedAt"
        TYPE TIMESTAMPTZ
        USING "startedAt" AT TIME ZONE 'UTC';
    END IF;

    -- completedAt
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'completedAt'
        AND udt_name = 'timestamp'
    ) THEN
        ALTER TABLE events
        ALTER COLUMN "completedAt"
        TYPE TIMESTAMPTZ
        USING "completedAt" AT TIME ZONE 'UTC';
    END IF;

    -- stoppedAt
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'stoppedAt'
        AND udt_name = 'timestamp'
    ) THEN
        ALTER TABLE events
        ALTER COLUMN "stoppedAt"
        TYPE TIMESTAMPTZ
        USING "stoppedAt" AT TIME ZONE 'UTC';
    END IF;

    -- disabledAt
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'disabledAt'
        AND udt_name = 'timestamp'
    ) THEN
        ALTER TABLE events
        ALTER COLUMN "disabledAt"
        TYPE TIMESTAMPTZ
        USING "disabledAt" AT TIME ZONE 'UTC';
    END IF;
END $$;

-- Step 6: Verify the changes
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('startTime', 'endTime', 'originalEndTime', 'startedAt', 'completedAt', 'stoppedAt', 'disabledAt')
ORDER BY column_name;

-- Expected result: All columns should show data_type = 'timestamp with time zone' and udt_name = 'timestamptz'









