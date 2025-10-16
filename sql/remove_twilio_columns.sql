-- Remove Twilio-related columns from user_settings table
-- This script removes Twilio phone number and missed call automation columns
-- since we're now using Google Business Profile for missed call handling

-- Remove Twilio phone number column
ALTER TABLE public.user_settings 
DROP COLUMN IF EXISTS twilio_phone_number;

-- Note: We're keeping missed_call_automation_enabled as it's now used for Google Business Profile
-- The column will be repurposed for Google Business Profile missed call automation

-- Add comment to clarify the new purpose
COMMENT ON COLUMN public.user_settings.missed_call_automation_enabled IS 'Enable missed call automation via Google Business Profile (previously Twilio)';
