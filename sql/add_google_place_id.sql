-- Add Google Place ID to user_settings for real review data

-- Add Google Place ID column
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_website TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_google_place_id ON public.user_settings(google_place_id);

-- Add comments for documentation
COMMENT ON COLUMN public.user_settings.google_place_id IS 'Google Places API place_id for fetching real reviews';
COMMENT ON COLUMN public.user_settings.business_name IS 'Business name for display in reviews';
COMMENT ON COLUMN public.user_settings.business_address IS 'Business address for Google Places';
COMMENT ON COLUMN public.user_settings.business_phone IS 'Business phone number';
COMMENT ON COLUMN public.user_settings.business_website IS 'Business website URL';
