-- ============================================
-- 🚨 URGENT FIX - Run This in Railway PostgreSQL Console
-- ============================================
-- This fixes the 500 error (missing columns) immediately
-- Run this BEFORE waiting for migration script
-- ============================================

-- Fix 1: Add missing columns (fixes 500 error)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;

-- Fix 2: Add recurring event columns (if missing)
-- Check if enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_events_recurringType') THEN
        CREATE TYPE "enum_events_recurringType" AS ENUM('weekly');
    END IF;
END$$;

-- Add recurring fields
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

-- Fix 3: Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN (
    'controlDevicePower', 
    'deviceOnTime', 
    'deviceOffTime',
    'isRecurring',
    'recurringType',
    'daysOfWeek',
    'recurringStartDate',
    'recurringEndDate',
    'timeStart',
    'timeEnd',
    'parentRecurringEventId'
)
ORDER BY column_name;

-- Fix 4: Add plan column to admins table (fixes admin login 500 error)
-- Step 1: Add column
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS "plan" VARCHAR(20) DEFAULT 'basic';

-- Step 2: Add CHECK constraint (if it doesn't exist)
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

-- Step 3: Set default for existing admins
UPDATE admins 
SET "plan" = 'basic' 
WHERE "plan" IS NULL;

-- Fix 5: Check admin password status
SELECT id, email, name, status,
       CASE 
         WHEN password IS NULL THEN 'NULL'
         WHEN password = '' THEN 'EMPTY'
         WHEN password NOT LIKE '$2%' THEN 'INVALID_HASH'
         ELSE 'VALID'
       END as password_status,
       LENGTH(password) as password_length
FROM admins
WHERE email = 'usman.abid00321@gmail.com';

-- ============================================
-- ✅ After running this:
-- 1. Backend will auto-restart
-- 2. Admin login 500 error will stop
-- 3. If password_status is NOT 'VALID', run: railway run npm run setup-users
-- ============================================

