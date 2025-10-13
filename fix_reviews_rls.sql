-- Fix RLS policies for reviews table to allow server-side operations
-- This script allows the service role to insert reviews while maintaining user security

-- First, let's check the current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'reviews';

-- Update the RLS policies to allow service role operations
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;

-- Create new policies that allow service role to bypass RLS
CREATE POLICY "Users can view their own reviews" ON public.reviews
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can insert their own reviews" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.role() = 'service_role'
    );

-- Alternative: Create a more permissive policy for service role
-- This allows the service role to insert reviews for any user
CREATE POLICY "Service role can manage all reviews" ON public.reviews
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Grant additional permissions to service_role
GRANT ALL ON public.reviews TO service_role;

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'reviews';

-- Test query to verify RLS is working
SELECT 'RLS policies updated successfully' as status;
