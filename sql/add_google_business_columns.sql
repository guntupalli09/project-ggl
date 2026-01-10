-- Add Google Business Profile columns to user_settings table
-- This script adds the missing columns needed for Google Business Profile integration

-- Add google_business_location_id column
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS google_business_location_id text;

-- Add google_business_connected column to track connection status
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS google_business_connected boolean DEFAULT false;

-- Add comment to document the new columns
COMMENT ON COLUMN public.user_settings.google_business_location_id IS 'Google Business Profile location ID for API calls';
COMMENT ON COLUMN public.user_settings.google_business_connected IS 'Whether Google Business Profile is connected';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name IN ('google_business_location_id', 'google_business_connected')
ORDER BY column_name;
