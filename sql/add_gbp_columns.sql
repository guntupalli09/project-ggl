-- Add Google Business Profile columns to user_settings table
-- Run this in your Supabase SQL Editor

-- Add GBP token storage columns
DO $$ 
BEGIN
  -- Add gbp_access_token column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'gbp_access_token'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gbp_access_token TEXT;
  END IF;
  
  -- Add gbp_refresh_token column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'gbp_refresh_token'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gbp_refresh_token TEXT;
  END IF;
  
  -- Add gbp_token_expiry column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'gbp_token_expiry'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gbp_token_expiry TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add gbp_account_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'gbp_account_id'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gbp_account_id TEXT;
  END IF;
END $$;

-- Create messages table for optional logging
CREATE TABLE IF NOT EXISTS messages_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for messages_log
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages_log' AND policyname = 'Users can view own messages') THEN
    CREATE POLICY "Users can view own messages" ON messages_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages_log' AND policyname = 'Users can insert own messages') THEN
    CREATE POLICY "Users can insert own messages" ON messages_log
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS on messages_log
ALTER TABLE messages_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_log_user_id ON messages_log(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_log_conversation_id ON messages_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_log_timestamp ON messages_log(timestamp);

-- Success message
SELECT 'GBP columns and messages_log table created successfully!' as status;
