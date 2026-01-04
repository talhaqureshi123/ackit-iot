-- Quick Fix: Add missing controlDevicePower, deviceOnTime, deviceOffTime columns to events table
-- Run this in Railway PostgreSQL Console if columns are missing

-- Add controlDevicePower column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false;

-- Add deviceOnTime column  
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ;

-- Add deviceOffTime column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN events."controlDevicePower" IS 'Whether this event controls device power (on/off)';
COMMENT ON COLUMN events."deviceOnTime" IS 'When to turn device ON (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';
COMMENT ON COLUMN events."deviceOffTime" IS 'When to turn device OFF (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'events' 
AND column_name IN ('controlDevicePower', 'deviceOnTime', 'deviceOffTime')
ORDER BY column_name;

