-- Simple Email System Setup (Minimal Version)
-- This creates just the essential tables for the email system

-- 1. Create email_workflow_settings table
CREATE TABLE IF NOT EXISTS email_workflow_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(100) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_ai_enhanced BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed'
  )),
  error_message TEXT,
  personalization_data JSONB DEFAULT '{}'::jsonb
);

-- 3. Create basic indexes
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_user_id ON email_workflow_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- 4. Enable RLS
ALTER TABLE email_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can manage their own email workflow settings" ON email_workflow_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR ALL USING (auth.uid() = user_id);

-- 6. Success message
DO $$
BEGIN
    RAISE NOTICE 'Simple email system setup completed successfully!';
    RAISE NOTICE 'Tables created: email_workflow_settings, email_logs';
    RAISE NOTICE 'Basic indexes and RLS policies have been applied';
END $$;
