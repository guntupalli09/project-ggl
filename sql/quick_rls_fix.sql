-- Quick RLS fix for bookings table
-- Run this in your Supabase SQL Editor

-- 1. Drop and recreate the insert policy
DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;

CREATE POLICY "Users can insert own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Verify the policy exists
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'bookings' AND policyname = 'Users can insert own bookings';

-- 3. Success message
SELECT 'Bookings insert policy fixed!' as status;
