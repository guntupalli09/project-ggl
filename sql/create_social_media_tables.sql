-- Social Media Tables Migration
-- Run this in Supabase SQL Editor to create social media functionality

-- ==============================================
-- SOCIAL ACCOUNTS TABLE
-- ==============================================
CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text CHECK (platform IN ('linkedin','facebook','instagram')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security for social_accounts
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for social_accounts
CREATE POLICY "Users can view their own social accounts" ON social_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social accounts" ON social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts" ON social_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts" ON social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for social_accounts
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);

-- ==============================================
-- SOCIAL POSTS TABLE
-- ==============================================
CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text CHECK (platform IN ('linkedin','facebook','instagram')),
  content text,
  image_url text,
  scheduled_time timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','failed')),
  post_id text, -- External platform post ID
  recurring_type text CHECK (recurring_type IN ('none','daily','weekly','custom')),
  recurring_data jsonb, -- Store recurring configuration
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security for social_posts
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for social_posts
CREATE POLICY "Users can view their own social posts" ON social_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social posts" ON social_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social posts" ON social_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social posts" ON social_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for social_posts
CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX idx_social_posts_platform ON social_posts(platform);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled_time ON social_posts(scheduled_time);

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for social_posts
CREATE TRIGGER update_social_posts_updated_at 
    BEFORE UPDATE ON social_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- SAMPLE DATA (Optional - for testing)
-- ==============================================

-- Uncomment the following lines to insert sample data for testing
/*
-- Sample social account (replace with actual user_id)
INSERT INTO social_accounts (user_id, platform, access_token, expires_at) 
VALUES (
  'your-user-id-here',
  'linkedin',
  'sample-access-token',
  now() + interval '60 days'
);

-- Sample social post (replace with actual user_id)
INSERT INTO social_posts (user_id, platform, content, scheduled_time, status) 
VALUES (
  'your-user-id-here',
  'linkedin',
  'Check out our latest product launch! #innovation #business',
  now() + interval '1 day',
  'scheduled'
);
*/
