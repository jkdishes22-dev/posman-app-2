-- Migration: Fix Bill Item Status Consistency and Bill Totals
-- This migration fixes the data inconsistency where pending bills have submitted items
-- and recalculates bill totals to exclude voided items

-- Step 1: Update all submitted items in pending bills to pending status
UPDATE `bill_item` bi
JOIN `bill` b ON bi.bill_id = b.id
SET bi.status = 'pending'
WHERE b.status = 'pending' AND bi.status = 'submitted';

-- Step 2: Recalculate bill totals for all pending bills to exclude voided items
UPDATE `bill` b
SET b.total = (
    SELECT COALESCE(SUM(bi.subtotal), 0)
    FROM `bill_item` bi
    WHERE bi.bill_id = b.id 
    AND bi.status != 'voided'
)
WHERE b.status = 'pending';

-- Step 3: Recalculate bill totals for all submitted bills to exclude voided items
UPDATE `bill` b
SET b.total = (
    SELECT COALESCE(SUM(bi.subtotal), 0)
    FROM `bill_item` bi
    WHERE bi.bill_id = b.id 
    AND bi.status != 'voided'
)
WHERE b.status = 'submitted';

-- Step 4: Recalculate bill totals for all reopened bills to exclude voided items
UPDATE `bill` b
SET b.total = (
    SELECT COALESCE(SUM(bi.subtotal), 0)
    FROM `bill_item` bi
    WHERE bi.bill_id = b.id 
    AND bi.status != 'voided'
)
WHERE b.status = 'reopened';

-- Step 5: Recalculate bill totals for all closed bills to exclude voided items
UPDATE `bill` b
SET b.total = (
    SELECT COALESCE(SUM(bi.subtotal), 0)
    FROM `bill_item` bi
    WHERE bi.bill_id = b.id 
    AND bi.status != 'voided'
)
WHERE b.status = 'closed';
