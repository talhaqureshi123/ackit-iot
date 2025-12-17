-- Migration: Add organizationId column to organizations table
-- This is needed because Venue model (which uses organizations table) needs to reference parent Organization

-- Add organizationId column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS "organizationId" INTEGER;

-- Add foreign key constraint (references venues table, which is used by Organization model)
ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_organizationId 
FOREIGN KEY ("organizationId") 
REFERENCES venues(id) 
ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_organizationId 
ON organizations("organizationId");

-- Note: After running this migration, the organizations table will have organizationId column
-- which allows Venue (child) to reference Organization (parent) stored in venues table

