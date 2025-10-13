-- Fix bookings RLS policy issue
-- Run this in your Supabase SQL Editor

-- 1. First, let's check what RLS policies exist for bookings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'bookings';

-- 2. Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;

-- 3. Create new RLS policies with proper syntax
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" ON bookings
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Verify RLS is enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 5. Test the policies by checking if they exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'bookings';

-- 6. Success message
SELECT 'Bookings RLS policies fixed successfully!' as status;
