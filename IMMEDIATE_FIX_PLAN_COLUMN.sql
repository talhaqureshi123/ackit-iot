-- ============================================
-- 🚨 IMMEDIATE FIX - Run This NOW in Railway PostgreSQL Console
-- ============================================
-- This fixes the "column plan does not exist" error immediately
-- ============================================

-- Step 1: Add plan column to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS "plan" VARCHAR(20) DEFAULT 'basic';

-- Step 2: Add CHECK constraint for valid plan values
DO $$
BEGIN
    -- Drop constraint if it exists (to avoid errors on re-run)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admins_plan_check'
    ) THEN
        ALTER TABLE admins DROP CONSTRAINT admins_plan_check;
    END IF;
    
    -- Add CHECK constraint
    ALTER TABLE admins 
    ADD CONSTRAINT admins_plan_check 
    CHECK ("plan" IN ('basic', 'advanced', 'premium', 'custom'));
END$$;

-- Step 3: Set default plan for existing admins
UPDATE admins 
SET "plan" = 'basic' 
WHERE "plan" IS NULL;

-- Step 4: Verify column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'admins' 
AND column_name = 'plan';

-- ============================================
-- ✅ After running this:
-- 1. Backend will auto-restart
-- 2. Admin login 500 error will stop
-- 3. Try login again
-- ============================================

