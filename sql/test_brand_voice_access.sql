-- Test script to verify brand_voice table access
-- Run this in Supabase SQL Editor to test

-- Check if table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'brand_voice' AND table_schema = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'brand_voice';

-- Test basic access (this should work if RLS is set up correctly)
SELECT COUNT(*) FROM public.brand_voice;

-- Check if user can insert (this will fail if RLS is blocking)
-- INSERT INTO public.brand_voice (user_id, brand_tone) 
-- VALUES (auth.uid(), 'Test brand tone') 
-- ON CONFLICT (user_id) DO UPDATE SET brand_tone = EXCLUDED.brand_tone;
