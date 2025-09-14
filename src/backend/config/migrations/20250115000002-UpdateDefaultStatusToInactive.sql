-- Update default status values for stations and pricelists to inactive
-- This migration changes the default values in the database schema

-- Update station table default status to 'inactive'
ALTER TABLE station MODIFY COLUMN status ENUM('active', 'inactive') DEFAULT 'inactive';

-- Update pricelist table default status to 'inactive'  
ALTER TABLE pricelist MODIFY COLUMN status ENUM('active', 'inactive', 'under_review') DEFAULT 'inactive';

-- Verify the changes
SHOW CREATE TABLE station;
SHOW CREATE TABLE pricelist;
