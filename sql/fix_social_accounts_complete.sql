-- Complete fix for social_accounts table to support LinkedIn OAuth
-- This ensures all required columns exist for proper LinkedIn integration

-- First, check if table exists, if not create it
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'twitter')),
    access_token TEXT,
    refresh_token TEXT,
    platform_user_id TEXT,
    platform_username TEXT,
    profile_picture_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
ADD COLUMN IF NOT EXISTS platform_username TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create unique constraint to prevent duplicate accounts
ALTER TABLE social_accounts 
DROP CONSTRAINT IF EXISTS social_accounts_user_platform_unique;

ALTER TABLE social_accounts 
ADD CONSTRAINT social_accounts_user_platform_unique 
UNIQUE (user_id, platform);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);

-- Enable RLS
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own social accounts" ON social_accounts;
CREATE POLICY "Users can view their own social accounts" 
ON social_accounts FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own social accounts" ON social_accounts;
CREATE POLICY "Users can insert their own social accounts" 
ON social_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own social accounts" ON social_accounts;
CREATE POLICY "Users can update their own social accounts" 
ON social_accounts FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own social accounts" ON social_accounts;
CREATE POLICY "Users can delete their own social accounts" 
ON social_accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE social_accounts IS 'Stores connected social media accounts with profile information';
COMMENT ON COLUMN social_accounts.platform_user_id IS 'Platform-specific user ID (e.g., LinkedIn user ID)';
COMMENT ON COLUMN social_accounts.platform_username IS 'Platform username or display name';
COMMENT ON COLUMN social_accounts.profile_picture_url IS 'URL to user profile picture on the platform';
COMMENT ON COLUMN social_accounts.access_token IS 'OAuth access token for the platform';
COMMENT ON COLUMN social_accounts.refresh_token IS 'OAuth refresh token for the platform';
COMMENT ON COLUMN social_accounts.expires_at IS 'When the access token expires';
