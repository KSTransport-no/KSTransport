-- Migration: Add vekt column to skift table
-- Date: 2024-12-19

-- Add vekt column to skift table
ALTER TABLE skift ADD COLUMN vekt INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN skift.vekt IS 'Total vekt i kg for alle sendinger i dette skiftet';

-- Update existing records with default vekt (25kg per sending)
UPDATE skift 
SET vekt = antall_sendinger * 25 
WHERE vekt = 0 AND antall_sendinger > 0;
