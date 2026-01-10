-- Fix RLS policies for workflow_automations table
-- This resolves the 42501 RLS policy violation error

-- First, drop the conflicting policies
DROP POLICY IF EXISTS "Allow public read access to workflow_automations" ON workflow_automations;
DROP POLICY IF EXISTS "Users can view their own workflow automations" ON workflow_automations;

-- Create a comprehensive policy that handles both public read and user-scoped access
CREATE POLICY "workflow_automations_access" ON workflow_automations
  FOR ALL USING (
    -- Allow public read access for system workflows (user_id IS NULL)
    user_id IS NULL 
    OR 
    -- Allow user access to their own workflows
    auth.uid() = user_id
  ) WITH CHECK (
    -- Allow inserts/updates for user workflows
    auth.uid() = user_id
    OR
    -- Allow system to insert public workflows (user_id IS NULL)
    user_id IS NULL
  );

-- Also ensure the table has proper permissions
GRANT ALL ON workflow_automations TO authenticated;
GRANT SELECT ON workflow_automations TO anon;
