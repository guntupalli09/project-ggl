-- Step-by-step fix for automations constraint
-- Run each section separately in your Supabase SQL Editor

-- STEP 1: Check current data
SELECT DISTINCT type, COUNT(*) as count 
FROM automations 
GROUP BY type 
ORDER BY type;

-- STEP 2: Drop the constraint (run this first)
ALTER TABLE automations DROP CONSTRAINT IF EXISTS automations_type_check;

-- STEP 3: Update the data (run this second)
UPDATE automations 
SET type = 'general' 
WHERE type IS NULL 
   OR type NOT IN ('general', 'lead-nurture', 'calendar', 'follow-up', 'missed-call', 'speed-to-lead');

-- STEP 4: Verify the update worked
SELECT DISTINCT type, COUNT(*) as count 
FROM automations 
GROUP BY type 
ORDER BY type;

-- STEP 5: Add the new constraint (run this last)
ALTER TABLE automations 
ADD CONSTRAINT automations_type_check 
CHECK (type IN ('general', 'lead-nurture', 'calendar', 'follow-up', 'missed-call', 'speed-to-lead'));

-- STEP 6: Verify everything is working
SELECT 'All steps completed successfully!' as status;
