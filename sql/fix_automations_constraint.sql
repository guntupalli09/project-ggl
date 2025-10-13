-- Fix automations constraint by updating existing data first
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what type values currently exist
SELECT DISTINCT type FROM automations WHERE type IS NOT NULL;

-- 2. Update any existing rows with invalid type values to 'general'
UPDATE automations 
SET type = 'general' 
WHERE type IS NULL 
   OR type NOT IN ('general', 'lead-nurture', 'calendar', 'follow-up', 'missed-call', 'speed-to-lead');

-- 3. Now drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'automations' 
    AND constraint_name = 'automations_type_check'
  ) THEN
    ALTER TABLE automations DROP CONSTRAINT automations_type_check;
  END IF;
END $$;

-- 4. Add the new constraint with all allowed types
ALTER TABLE automations 
ADD CONSTRAINT automations_type_check 
CHECK (type IN ('general', 'lead-nurture', 'calendar', 'follow-up', 'missed-call', 'speed-to-lead'));

-- 5. Verify the constraint was applied
SELECT 'Automations constraint fixed successfully!' as status;
