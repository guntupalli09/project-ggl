-- Quick fix for RLS policies on user_settings table
-- Run this in your Supabase SQL editor

-- First, let's check if the table exists and create it if needed
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT,
  business_slug TEXT,
  custom_domain TEXT,
  booking_link TEXT,
  niche_template_id UUID,
  workflow_stage TEXT DEFAULT 'new',
  twilio_phone_number TEXT,
  google_place_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_settings;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_settings;

-- Create simple, permissive policies
CREATE POLICY "Enable read access for all users" ON user_settings
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_settings TO anon;
