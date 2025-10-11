-- FINAL user_settings table - Complete recreation with all GGL features
-- Run this in Supabase SQL Editor to completely recreate the table

-- Drop existing table and all dependencies
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Create the complete user_settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  business_slug TEXT UNIQUE,
  logo_url TEXT,
  booking_link TEXT,
  niche TEXT,
  twilio_phone_number TEXT,
  business_phone TEXT,
  missed_call_automation_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX idx_user_settings_business_slug ON public.user_settings(business_slug);
CREATE INDEX idx_user_settings_twilio_phone ON public.user_settings(twilio_phone_number);

-- Create function to generate business slug from business name
CREATE OR REPLACE FUNCTION public.generate_business_slug(business_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF business_name IS NULL OR business_name = '' THEN
    RETURN NULL;
  END IF;
  
  -- Convert to lowercase, replace spaces and special chars with hyphens
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(business_name, '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically set business_slug
CREATE OR REPLACE FUNCTION public.auto_generate_business_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set business_slug if it's null and business_name exists
  IF NEW.business_slug IS NULL AND NEW.business_name IS NOT NULL THEN
    NEW.business_slug := public.generate_business_slug(NEW.business_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate business_slug
CREATE TRIGGER auto_set_business_slug
  BEFORE INSERT OR UPDATE OF business_name ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_business_slug();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on every update
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own settings
CREATE POLICY "Users can view own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Public read access to business_slug for lead capture forms
CREATE POLICY "Public read access for business_slug" 
ON public.user_settings FOR SELECT 
USING (business_slug IS NOT NULL);

-- Grant necessary permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT SELECT ON public.user_settings TO anon;

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.user_settings'::regclass;

-- Verify triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_settings'
AND event_object_schema = 'public';

-- Success message
SELECT 'user_settings table created successfully with all GGL features!' as status;
