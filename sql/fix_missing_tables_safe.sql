-- Safe fix for missing tables and columns
-- This handles cases where tables might already exist with different schemas

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create brand_voice table (safe)
CREATE TABLE IF NOT EXISTS brand_voice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tone_description TEXT,
  sample_copy TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create bookings table (safe)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service TEXT NOT NULL,
  booking_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no-show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add lead_id column to bookings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN lead_id UUID;
  END IF;
END $$;

-- 5. Add foreign key constraint for lead_id if it doesn't exist
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

-- 6. Add missing columns to automations table
DO $$ 
BEGIN
  -- Add type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automations' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE automations ADD COLUMN type TEXT DEFAULT 'general';
  END IF;
  
  -- Add trigger_event column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automations' 
    AND column_name = 'trigger_event'
  ) THEN
    ALTER TABLE automations ADD COLUMN trigger_event TEXT;
  END IF;
  
  -- Add action_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automations' 
    AND column_name = 'action_type'
  ) THEN
    ALTER TABLE automations ADD COLUMN action_type TEXT;
  END IF;
  
  -- Add event_template column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automations' 
    AND column_name = 'event_template'
  ) THEN
    ALTER TABLE automations ADD COLUMN event_template TEXT;
  END IF;
  
  -- Add delay_minutes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'automations' 
    AND column_name = 'delay_minutes'
  ) THEN
    ALTER TABLE automations ADD COLUMN delay_minutes INTEGER DEFAULT 0;
  END IF;
END $$;

-- 7. Add missing columns to user_settings table
DO $$ 
BEGIN
  -- Add niche column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'niche'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN niche TEXT;
  END IF;
  
  -- Add brand_voice_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'brand_voice_id'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN brand_voice_id UUID REFERENCES brand_voice(id);
  END IF;
END $$;

-- 8. Create RLS policies for brand_voice
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_voice' AND policyname = 'Users can view own brand voice') THEN
    CREATE POLICY "Users can view own brand voice" ON brand_voice
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_voice' AND policyname = 'Users can insert own brand voice') THEN
    CREATE POLICY "Users can insert own brand voice" ON brand_voice
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_voice' AND policyname = 'Users can update own brand voice') THEN
    CREATE POLICY "Users can update own brand voice" ON brand_voice
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_voice' AND policyname = 'Users can delete own brand voice') THEN
    CREATE POLICY "Users can delete own brand voice" ON brand_voice
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9. Create RLS policies for bookings
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

-- 10. Create indexes for performance (safe)
CREATE INDEX IF NOT EXISTS idx_brand_voice_user_id ON brand_voice(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_time ON bookings(booking_time);

-- 11. Enable RLS on new tables
ALTER TABLE brand_voice ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 12. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_brand_voice_updated_at'
  ) THEN
    CREATE TRIGGER update_brand_voice_updated_at 
      BEFORE UPDATE ON brand_voice 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_bookings_updated_at'
  ) THEN
    CREATE TRIGGER update_bookings_updated_at 
      BEFORE UPDATE ON bookings 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
