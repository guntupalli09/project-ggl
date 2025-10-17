-- Final Email System Setup (Compatible with your existing database)
-- This creates the email system using only columns that exist in your database

-- ========================================
-- STEP 1: Create Email Workflows Table
-- ========================================

-- Create email_workflow_settings table (using auth.users and existing structure)
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

-- ========================================
-- STEP 2: Create Email Logs Table
-- ========================================

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

-- ========================================
-- STEP 3: Create Email Templates Table (Simplified - No niche/business_type)
-- ========================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 4: Create Basic Indexes
-- ========================================

-- Email Workflow Settings Indexes
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_user_id ON email_workflow_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_campaign_type ON email_workflow_settings(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_trigger_event ON email_workflow_settings(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_is_active ON email_workflow_settings(is_active);

-- Email Logs Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer_email ON email_logs(customer_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_type ON email_logs(campaign_type);

-- Email Templates Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_campaign_type ON email_templates(campaign_type);

-- ========================================
-- STEP 5: Create Updated_at Trigger
-- ========================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_email_workflow_settings_updated_at 
    BEFORE UPDATE ON email_workflow_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 6: Enable Row Level Security
-- ========================================

-- Enable RLS on all tables
ALTER TABLE email_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 7: Create RLS Policies
-- ========================================

-- Email Workflow Settings Policies
CREATE POLICY "Users can view their own email workflow settings" ON email_workflow_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email workflow settings" ON email_workflow_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email workflow settings" ON email_workflow_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email workflow settings" ON email_workflow_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Email Logs Policies
CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR ALL USING (auth.uid() = user_id);

-- Email Templates Policies
CREATE POLICY "Users can manage their own email templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- STEP 8: Insert Default Templates (No niche/business_type)
-- ========================================

-- Insert default email templates (without user_id for global templates)
INSERT INTO email_templates (name, campaign_type, subject_template, content_template, is_default, variables) VALUES
-- Review Request Templates
('Review Request - General', 'review_request', 
 'How was your experience? We''d love to hear about it!',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re happy with your recent visit to {business_name}!</p><p>Your feedback means everything to us and helps other customers discover our services.</p><p><a href="{review_link}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to book your next appointment? <a href="{booking_link}">Click here</a></p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "review_link", "booking_link"}'),

-- Re-engagement Templates
('Re-engagement - General', 're_engagement',
 'We miss you! Here''s what''s new at {business_name}',
 '<h2>Hi {customer_name}!</h2><p>It''s been a while since we''ve seen you at {business_name}!</p><p>We''ve got some exciting new services and special offers just for you:</p><ul><li>New services and techniques</li><li>Special discount on your next visit</li><li>Updated business hours</li></ul><p><a href="{booking_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book Your Appointment</a></p><p>We can''t wait to see you again!<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "booking_link"}'),

-- Welcome Templates
('Welcome Series - General', 'welcome',
 'Welcome to {business_name}! Here''s what to expect',
 '<h2>Welcome to {business_name}, {customer_name}!</h2><p>We''re thrilled to have you as a new customer!</p><p>Here''s what you can expect from us:</p><ul><li>High-quality service and care</li><li>Flexible scheduling options</li><li>Ongoing support and follow-up</li></ul><p>Ready to get started? <a href="{booking_link}">Book your first appointment</a></p><p>Questions? Just reply to this email!</p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "booking_link"}'),

-- Appointment Reminder Templates
('Appointment Reminder - General', 'appointment_reminder',
 'Reminder: Your appointment with {business_name} is tomorrow',
 '<h2>Hi {customer_name}!</h2><p>This is a friendly reminder that you have an appointment with {business_name} tomorrow at {appointment_time}.</p><p>Appointment Details:</p><ul><li>Date: {appointment_date}</li><li>Time: {appointment_time}</li><li>Service: {service_name}</li></ul><p>Need to reschedule? <a href="{booking_link}">Click here</a></p><p>We look forward to seeing you!</p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "appointment_time", "appointment_date", "service_name", "booking_link"}'),

-- Educational Content Templates
('Educational Content - General', 'educational',
 'Tips and insights from {business_name}',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re doing well!</p><p>This month, we wanted to share some valuable tips and insights that might be helpful for you:</p><ul><li>{tip_1}</li><li>{tip_2}</li><li>{tip_3}</li></ul><p>Have questions about any of these tips? We''re here to help!</p><p>Ready to schedule your next visit? <a href="{booking_link}">Book online</a></p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "tip_1", "tip_2", "tip_3", "booking_link"}'),

-- Follow-up Templates
('Follow-up - General', 'follow_up',
 'How was your recent visit to {business_name}?',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re happy with your recent visit to {business_name}!</p><p>We''d love to hear about your experience and make sure everything met your expectations.</p><p>If you have any questions or concerns, please don''t hesitate to reach out to us.</p><p>Ready for your next visit? <a href="{booking_link}">Schedule here</a></p><p>Thank you for choosing {business_name}!<br>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "booking_link"}');

-- ========================================
-- STEP 9: Add Table Comments
-- ========================================

-- Add comments for documentation
COMMENT ON TABLE email_workflow_settings IS 'Stores email workflow configurations and settings for automated email campaigns';
COMMENT ON TABLE email_logs IS 'Log of all emails sent with delivery and engagement tracking';
COMMENT ON TABLE email_templates IS 'Email templates with personalization variables for different campaign types';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Email system setup completed successfully!';
    RAISE NOTICE 'Tables created: email_workflow_settings, email_logs, email_templates';
    RAISE NOTICE 'Indexes, triggers, and RLS policies have been applied';
    RAISE NOTICE 'Default email templates have been inserted';
    RAISE NOTICE 'No niche/business_type columns - using campaign_type only';
END $$;
