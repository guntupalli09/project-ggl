-- Update existing automations table to add type column
-- This adds the missing 'type' column to the existing automations table

-- Add type column to existing automations table
ALTER TABLE automations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'followup' CHECK (type IN ('followup', 'calendar', 'booking', 'reminder'));

-- Update existing automations to have the correct type
UPDATE automations SET type = 'followup' WHERE type IS NULL OR type = 'followup';

-- Add other missing columns for calendar automations
ALTER TABLE automations ADD COLUMN IF NOT EXISTS trigger_event TEXT;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS event_template JSONB;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0;
