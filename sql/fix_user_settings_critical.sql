-- Fix Critical Database Schema Issues
-- Run this in Supabase SQL Editor

-- Add missing Google Calendar and Business Profile columns to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_calendar_email TEXT,
ADD COLUMN IF NOT EXISTS google_business_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS missed_call_automation_enabled BOOLEAN DEFAULT FALSE;

-- Create indexes for Google Calendar and Business Profile queries
CREATE INDEX IF NOT EXISTS idx_user_settings_google_calendar_connected 
ON public.user_settings(google_calendar_connected) 
WHERE google_calendar_connected = true;

CREATE INDEX IF NOT EXISTS idx_user_settings_google_business_connected 
ON public.user_settings(google_business_connected) 
WHERE google_business_connected = true;

-- Update RLS policies to allow users to update their own Google tokens and other settings
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Public read access for business_slug" ON public.user_settings;

-- Recreate policies with comprehensive access
CREATE POLICY "Users can view own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow public read access to business_slug for lead capture forms
CREATE POLICY "Public read access for business_slug" 
ON public.user_settings FOR SELECT 
USING (business_slug IS NOT NULL);

-- Grant necessary permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT SELECT ON public.user_settings TO anon;

-- Verify the new columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND table_schema = 'public'
AND column_name LIKE 'google_%' OR column_name IN ('business_phone', 'missed_call_automation_enabled')
ORDER BY ordinal_position;
