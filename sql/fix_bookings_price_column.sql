-- Fix bookings table - add missing price column
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what columns currently exist in bookings table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 2. Add price column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'price'
  ) THEN
    ALTER TABLE bookings ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- 3. Verify the price column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 4. Show success message
SELECT 'Bookings price column added successfully!' as status;
