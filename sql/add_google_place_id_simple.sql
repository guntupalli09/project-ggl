-- Add Google Place ID to user_settings for real review data (Simple version)

-- Add Google Place ID column
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_website TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_google_place_id ON public.user_settings(google_place_id);
