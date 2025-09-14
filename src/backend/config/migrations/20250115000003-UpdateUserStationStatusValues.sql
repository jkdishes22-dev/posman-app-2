-- Update user_station status values from enabled/disabled to active/inactive
-- This migration updates the user_station table to use the standardized status values

-- Update enabled to active
UPDATE user_station 
SET status = 'active' 
WHERE status = 'enabled';

-- Update disabled to inactive  
UPDATE user_station 
SET status = 'inactive' 
WHERE status = 'disabled';

-- Update NULL values to inactive (if any exist)
UPDATE user_station 
SET status = 'inactive' 
WHERE status IS NULL;
