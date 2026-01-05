-- ============================================
-- 🚨 QUICK FIX - Run This in Railway PostgreSQL Console
-- ============================================
-- This fixes ALL missing columns at once
-- Copy-paste the entire block and run
-- ============================================

-- ============================================
-- PART 1: Fix Events Table Columns
-- ============================================

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;

-- Recurring event columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_events_recurringType') THEN
        CREATE TYPE "enum_events_recurringType" AS ENUM('weekly');
    END IF;
END$$;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "recurringType" "enum_events_recurringType";

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "daysOfWeek" JSONB;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "recurringStartDate" DATE;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "recurringEndDate" DATE;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "timeStart" TIME;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "timeEnd" TIME;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "parentRecurringEventId" INTEGER;

-- ============================================
-- PART 2: Fix Admins Table - Plan Column
-- ============================================

-- Add plan column
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS "plan" VARCHAR(20) DEFAULT 'basic';

-- Add CHECK constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admins_plan_check'
    ) THEN
        ALTER TABLE admins 
        ADD CONSTRAINT admins_plan_check 
        CHECK ("plan" IN ('basic', 'advanced', 'premium', 'custom'));
    END IF;
END$$;

-- Set default for existing admins
UPDATE admins 
SET "plan" = 'basic' 
WHERE "plan" IS NULL;

-- ============================================
-- PART 3: Verify All Columns
-- ============================================

-- Verify events columns
SELECT 'Events Table' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN (
    'controlDevicePower', 'deviceOnTime', 'deviceOffTime',
    'isRecurring', 'recurringType', 'daysOfWeek',
    'recurringStartDate', 'recurringEndDate',
    'timeStart', 'timeEnd', 'parentRecurringEventId'
)
ORDER BY column_name;

-- Verify admins plan column
SELECT 'Admins Table' as table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'admins' 
AND column_name = 'plan';

-- ============================================
-- ✅ DONE! All columns are now added.
-- Backend will auto-restart and login should work.
-- ============================================

