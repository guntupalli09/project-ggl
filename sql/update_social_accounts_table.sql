-- Update social_accounts table to include profile information
-- Add missing columns for LinkedIn profile data

ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
ADD COLUMN IF NOT EXISTS platform_username TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Update the table comment
COMMENT ON TABLE social_accounts IS 'Stores linked social media accounts with profile information';
COMMENT ON COLUMN social_accounts.platform_user_id IS 'Platform-specific user ID (e.g., LinkedIn user ID)';
COMMENT ON COLUMN social_accounts.platform_username IS 'Platform username or display name';
COMMENT ON COLUMN social_accounts.profile_picture_url IS 'URL to user profile picture on the platform';
