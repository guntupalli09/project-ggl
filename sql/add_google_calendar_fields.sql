-- Add Google Calendar integration fields to user_settings table
-- Run this in Supabase SQL Editor

-- Add Google Calendar fields to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_calendar_email TEXT;

-- Create index for Google Calendar queries
CREATE INDEX IF NOT EXISTS idx_user_settings_google_connected 
ON public.user_settings(google_calendar_connected) 
WHERE google_calendar_connected = true;

-- Update RLS policies to allow users to update their own Google tokens
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own settings
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Verify the new columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND table_schema = 'public'
AND column_name LIKE 'google_%'
ORDER BY ordinal_position;
