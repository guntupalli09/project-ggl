-- Fix workflow_automations table constraints to allow NULL trigger_event for manual entries
-- This resolves the 23502 NOT NULL constraint violation

-- Make trigger_event nullable for manual workflow entries
ALTER TABLE workflow_automations 
ALTER COLUMN trigger_event DROP NOT NULL;

-- Add a check constraint to ensure trigger_event is provided for system automations
-- but allow NULL for manual entries
ALTER TABLE workflow_automations 
ADD CONSTRAINT chk_trigger_event_system_or_manual 
CHECK (
  (niche_template_id IS NOT NULL AND trigger_event IS NOT NULL) OR  -- System automation
  (niche_template_id IS NULL AND trigger_event IS NULL)             -- Manual entry
);

-- Update the comment to reflect the change
COMMENT ON COLUMN workflow_automations.trigger_event IS 'Event that triggers the automation (booking_completed, review_received, etc.). NULL for manual entries.';
