-- Create email_workflow_settings table
-- This table stores email workflow configurations and settings

CREATE TABLE IF NOT EXISTS email_workflow_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_user_id ON email_workflow_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_campaign_type ON email_workflow_settings(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_trigger_event ON email_workflow_settings(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_is_active ON email_workflow_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_created_at ON email_workflow_settings(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_workflow_settings_updated_at 
    BEFORE UPDATE ON email_workflow_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE email_workflow_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own email workflow settings" ON email_workflow_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email workflow settings" ON email_workflow_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email workflow settings" ON email_workflow_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email workflow settings" ON email_workflow_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Insert some default workflows for different business types
INSERT INTO email_workflow_settings (user_id, name, description, campaign_type, trigger_event, is_active, is_ai_enhanced) VALUES
-- These will be created for each user during onboarding
-- (uuid_generate_v4(), 'Welcome Series', 'Automated welcome emails for new customers', 'welcome', 'lead_created', true, true),
-- (uuid_generate_v4(), 'Review Request', 'Request reviews after service completion', 'review_request', 'booking_completed', true, true),
-- (uuid_generate_v4(), 'Re-engagement', 'Re-engage inactive customers', 're_engagement', 'follow_up', true, true),
-- (uuid_generate_v4(), 'Appointment Reminder', 'Remind customers of upcoming appointments', 'appointment_reminder', 'appointment_reminder', true, true),
-- (uuid_generate_v4(), 'Educational Content', 'Share educational content with customers', 'educational', 'follow_up', true, true),
-- (uuid_generate_v4(), 'Market Update', 'Share market updates and news', 'market_update', 'follow_up', true, true),
-- (uuid_generate_v4(), 'Open House Invite', 'Invite customers to open house events', 'open_house', 'follow_up', true, true),
-- (uuid_generate_v4(), 'Lead Nurturing', 'Nurture leads through the sales process', 'lead_nurturing', 'lead_created', true, true),
-- (uuid_generate_v4(), 'Maintenance Reminder', 'Remind customers of maintenance needs', 'maintenance_reminder', 'follow_up', true, true),
-- (uuid_generate_v4(), 'Follow-up', 'General follow-up communications', 'follow_up', 'follow_up', true, true);

-- Add comments for documentation
COMMENT ON TABLE email_workflow_settings IS 'Stores email workflow configurations and settings for automated email campaigns';
COMMENT ON COLUMN email_workflow_settings.user_id IS 'Reference to the user who owns this workflow';
COMMENT ON COLUMN email_workflow_settings.name IS 'Display name for the workflow';
COMMENT ON COLUMN email_workflow_settings.description IS 'Detailed description of what the workflow does';
COMMENT ON COLUMN email_workflow_settings.campaign_type IS 'Type of email campaign (review_request, re_engagement, welcome, etc.)';
COMMENT ON COLUMN email_workflow_settings.trigger_event IS 'Event that triggers this workflow (booking_completed, review_received, etc.)';
COMMENT ON COLUMN email_workflow_settings.is_active IS 'Whether the workflow is currently active and will execute';
COMMENT ON COLUMN email_workflow_settings.is_ai_enhanced IS 'Whether the workflow uses AI for content generation';
COMMENT ON COLUMN email_workflow_settings.execution_count IS 'Number of times this workflow has been executed';
COMMENT ON COLUMN email_workflow_settings.last_executed IS 'Timestamp of the last execution';
COMMENT ON COLUMN email_workflow_settings.created_at IS 'When the workflow was created';
COMMENT ON COLUMN email_workflow_settings.updated_at IS 'When the workflow was last updated';