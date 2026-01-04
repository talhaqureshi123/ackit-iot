-- Migration: Add device power control fields to events table
-- Run this SQL in your PostgreSQL database

ALTER TABLE events
ADD COLUMN IF NOT EXISTS "controlDevicePower" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "deviceOnTime" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "deviceOffTime" TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN events."controlDevicePower" IS 'Whether this event controls device power (on/off)';
COMMENT ON COLUMN events."deviceOnTime" IS 'When to turn device ON (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';
COMMENT ON COLUMN events."deviceOffTime" IS 'When to turn device OFF (for non-recurring events, stored as UTC TIMESTAMPTZ; for recurring events, stored as TIME)';






