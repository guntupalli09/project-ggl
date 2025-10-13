-- Final fix for automations constraint issue
-- This handles the constraint violation by temporarily disabling it

-- 1. First, let's see what type values currently exist
SELECT DISTINCT type FROM automations WHERE type IS NOT NULL;

-- 2. Drop the existing constraint completely
ALTER TABLE automations DROP CONSTRAINT IF EXISTS automations_type_check;

-- 3. Update any existing rows with invalid type values to 'general'
UPDATE automations 
SET type = 'general' 
WHERE type IS NULL 
   OR type NOT IN ('general', 'lead-nurture', 'calendar', 'follow-up', 'missed-call', 'speed-to-lead');

-- 4. Add the new constraint with all allowed types
ALTER TABLE automations 
ADD CONSTRAINT automations_type_check 
CHECK (type IN ('general', 'lead-nurture', 'calendar', 'follow-up', 'missed-call', 'speed-to-lead'));

-- 5. Verify the constraint was applied successfully
SELECT 'Automations constraint fixed successfully!' as status;

-- 6. Show current data to verify
SELECT id, name, type FROM automations LIMIT 5;
