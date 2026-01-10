-- Complete fix for bookings table - ensure all required columns exist
-- Run this in your Supabase SQL Editor

-- 1. Check current bookings table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 2. Add missing columns to bookings table
DO $$ 
BEGIN
  -- Add price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'price'
  ) THEN
    ALTER TABLE bookings ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
  END IF;
  
  -- Add lead_id column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN lead_id UUID;
  END IF;
  
  -- Add customer_name column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_name TEXT;
  END IF;
  
  -- Add customer_email column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_email TEXT;
  END IF;
  
  -- Add service column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'service'
  ) THEN
    ALTER TABLE bookings ADD COLUMN service TEXT;
  END IF;
  
  -- Add booking_time column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'booking_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN booking_time TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add duration_minutes column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_minutes INTEGER DEFAULT 60;
  END IF;
  
  -- Add status column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'confirmed';
  END IF;
  
  -- Add notes column (if not already added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN notes TEXT;
  END IF;
END $$;

-- 3. Add foreign key constraint for lead_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND constraint_name = 'bookings_lead_id_fkey'
  ) THEN
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Create RLS policies for bookings if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can view own bookings') THEN
    CREATE POLICY "Users can view own bookings" ON bookings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can insert own bookings') THEN
    CREATE POLICY "Users can insert own bookings" ON bookings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can update own bookings') THEN
    CREATE POLICY "Users can update own bookings" ON bookings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can delete own bookings') THEN
    CREATE POLICY "Users can delete own bookings" ON bookings
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_time ON bookings(booking_time);

-- 6. Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 7. Show final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'bookings'
ORDER BY ordinal_position;

-- 8. Success message
SELECT 'Bookings table fixed successfully!' as status;
