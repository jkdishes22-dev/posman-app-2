-- Fix inconsistent station status values
-- This migration standardizes all station status values to 'active' or 'inactive'

-- Update 'enabled' status to 'active'
UPDATE station SET status = 'active' WHERE status = 'enabled';

-- Update 'disabled' status to 'inactive'  
UPDATE station SET status = 'inactive' WHERE status = 'disabled';

-- Update NULL status to 'inactive'
UPDATE station SET status = 'inactive' WHERE status IS NULL;

-- Verify the changes
SELECT id, name, status FROM station ORDER BY id;
