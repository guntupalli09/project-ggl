-- Fix RLS policies for automation_logs table to allow all users to read logs
-- This is for demo purposes only

-- First, check if RLS is enabled on the table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'automation_logs';

-- Disable RLS temporarily for demo purposes
ALTER TABLE automation_logs DISABLE ROW LEVEL SECURITY;

-- Or create a policy that allows all users to read logs
-- ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Allow all users to read automation logs" ON automation_logs;
-- CREATE POLICY "Allow all users to read automation logs" 
-- ON automation_logs FOR SELECT 
-- TO authenticated, anon
-- USING (true);

-- Verify the change
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'automation_logs';

