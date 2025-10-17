-- Complete Email System Setup Script
-- This script sets up the entire email marketing system in the correct order

-- ========================================
-- STEP 1: Create Email Workflows Table
-- ========================================

-- Create email_workflow_settings table
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

-- Create indexes for email_workflow_settings
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_user_id ON email_workflow_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_campaign_type ON email_workflow_settings(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_trigger_event ON email_workflow_settings(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_is_active ON email_workflow_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_created_at ON email_workflow_settings(created_at);

-- ========================================
-- STEP 2: Create Email Campaigns Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'review_request', 're_engagement', 'market_update', 'open_house', 
    'lead_nurturing', 'educational', 'treatment_plan', 'maintenance_reminder',
    'appointment_reminder', 'follow_up', 'welcome', 'promotional'
  )),
  niche TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metrics JSONB DEFAULT '{}'::jsonb
);

-- ========================================
-- STEP 3: Create Email Templates Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
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
-- STEP 4: Create Email Logs Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  customer_data JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed'
  )),
  message_id TEXT,
  error_message TEXT,
  personalization_data JSONB DEFAULT '{}'::jsonb
);

-- ========================================
-- STEP 5: Create Additional Email Tables
-- ========================================

-- Automation Triggers Table
CREATE TABLE IF NOT EXISTS automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN (
    'appointment_completed', 'appointment_cancelled', 'new_lead_created',
    'lead_converted', 'payment_received', 'review_received', 'client_inactive',
    'maintenance_due', 'open_house_scheduled', 'market_update', 'treatment_completed',
    'consultation_scheduled', 'treatment_plan_created'
  )),
  email_campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  conditions JSONB DEFAULT '{}'::jsonb,
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Unsubscribes Table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  campaign_type TEXT,
  reason TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Email Sequences Table
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  steps JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Personalization Data Table
CREATE TABLE IF NOT EXISTS email_personalization_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  business_data JSONB DEFAULT '{}'::jsonb,
  customer_data JSONB DEFAULT '{}'::jsonb,
  service_history JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, customer_email)
);

-- Email Performance Metrics Table
CREATE TABLE IF NOT EXISTS email_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  emails_replied INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  unsubscribe_rate DECIMAL(5,2) DEFAULT 0.00,
  reply_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, campaign_id, date)
);

-- ========================================
-- STEP 6: Create Indexes
-- ========================================

-- Email Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_niche ON email_campaigns(niche);

-- Email Templates Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_niche ON email_templates(niche);
CREATE INDEX IF NOT EXISTS idx_email_templates_campaign_type ON email_templates(campaign_type);

-- Email Logs Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer_email ON email_logs(customer_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_type ON email_logs(campaign_type);

-- Automation Triggers Indexes
CREATE INDEX IF NOT EXISTS idx_automation_triggers_user_id ON automation_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_event ON automation_triggers(event);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_active ON automation_triggers(is_active);

-- Other Indexes
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_email ON email_unsubscribes(user_id, email);
CREATE INDEX IF NOT EXISTS idx_email_performance_metrics_user_date ON email_performance_metrics(user_id, date);

-- ========================================
-- STEP 7: Create Functions and Triggers
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

-- Email metrics calculation function
CREATE OR REPLACE FUNCTION calculate_email_metrics(campaign_uuid UUID, target_date DATE)
RETURNS VOID AS $$
DECLARE
  total_sent INTEGER;
  total_delivered INTEGER;
  total_opened INTEGER;
  total_clicked INTEGER;
  total_bounced INTEGER;
  total_unsubscribed INTEGER;
  total_replied INTEGER;
BEGIN
  -- Get metrics for the campaign and date
  SELECT 
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')),
    COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')),
    COUNT(*) FILTER (WHERE status = 'clicked'),
    COUNT(*) FILTER (WHERE status = 'bounced'),
    COUNT(*) FILTER (WHERE status = 'unsubscribed'),
    COUNT(*) FILTER (WHERE status = 'replied')
  INTO total_sent, total_delivered, total_opened, total_clicked, total_bounced, total_unsubscribed, total_replied
  FROM email_logs
  WHERE campaign_id = campaign_uuid
  AND DATE(sent_at) = target_date;

  -- Insert or update metrics
  INSERT INTO email_performance_metrics (
    user_id, campaign_id, date, emails_sent, emails_delivered, emails_opened,
    emails_clicked, emails_bounced, emails_unsubscribed, emails_replied,
    delivery_rate, open_rate, click_rate, bounce_rate, unsubscribe_rate, reply_rate
  )
  SELECT 
    user_id, campaign_uuid, target_date, total_sent, total_delivered, total_opened,
    total_clicked, total_bounced, total_unsubscribed, total_replied,
    CASE WHEN total_sent > 0 THEN (total_delivered::DECIMAL / total_sent::DECIMAL) * 100 ELSE 0 END,
    CASE WHEN total_delivered > 0 THEN (total_opened::DECIMAL / total_delivered::DECIMAL) * 100 ELSE 0 END,
    CASE WHEN total_delivered > 0 THEN (total_clicked::DECIMAL / total_delivered::DECIMAL) * 100 ELSE 0 END,
    CASE WHEN total_sent > 0 THEN (total_bounced::DECIMAL / total_sent::DECIMAL) * 100 ELSE 0 END,
    CASE WHEN total_sent > 0 THEN (total_unsubscribed::DECIMAL / total_sent::DECIMAL) * 100 ELSE 0 END,
    CASE WHEN total_delivered > 0 THEN (total_replied::DECIMAL / total_delivered::DECIMAL) * 100 ELSE 0 END
  FROM email_campaigns
  WHERE id = campaign_uuid
  ON CONFLICT (user_id, campaign_id, date) DO UPDATE SET
    emails_sent = EXCLUDED.emails_sent,
    emails_delivered = EXCLUDED.emails_delivered,
    emails_opened = EXCLUDED.emails_opened,
    emails_clicked = EXCLUDED.emails_clicked,
    emails_bounced = EXCLUDED.emails_bounced,
    emails_unsubscribed = EXCLUDED.emails_unsubscribed,
    emails_replied = EXCLUDED.emails_replied,
    delivery_rate = EXCLUDED.delivery_rate,
    open_rate = EXCLUDED.open_rate,
    click_rate = EXCLUDED.click_rate,
    bounce_rate = EXCLUDED.bounce_rate,
    unsubscribe_rate = EXCLUDED.unsubscribe_rate,
    reply_rate = EXCLUDED.reply_rate;
END;
$$ LANGUAGE plpgsql;

-- Email metrics update trigger
CREATE OR REPLACE FUNCTION trigger_email_metrics_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update metrics when email log is updated
  PERFORM calculate_email_metrics(NEW.campaign_id, DATE(NEW.sent_at));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_metrics
  AFTER INSERT OR UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_email_metrics_update();

-- ========================================
-- STEP 8: Enable Row Level Security
-- ========================================

-- Enable RLS on all tables
ALTER TABLE email_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_personalization_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_performance_metrics ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 9: Create RLS Policies
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

-- Email Campaigns Policies
CREATE POLICY "Users can manage their own email campaigns" ON email_campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Email Templates Policies
CREATE POLICY "Users can manage their own email templates" ON email_templates
  FOR ALL USING (auth.uid() = user_id);

-- Email Logs Policies
CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR ALL USING (auth.uid() = user_id);

-- Other Policies
CREATE POLICY "Users can manage their own automation triggers" ON automation_triggers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own unsubscribes" ON email_unsubscribes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own email sequences" ON email_sequences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own personalization data" ON email_personalization_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own performance metrics" ON email_performance_metrics
  FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- STEP 10: Insert Default Templates
-- ========================================

-- Insert default email templates (without user_id for global templates)
INSERT INTO email_templates (name, niche, campaign_type, subject_template, content_template, is_default, variables) VALUES
-- Salon Templates
('Salon Review Request', 'salon', 'review_request', 
 'How did you love your {service}? We''d love to hear about it!',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re loving your new {service} from {stylist_name}!</p><p>Your feedback means everything to us and helps other clients discover our services.</p><p><a href="{review_link}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to book your next appointment? <a href="{booking_link}">Click here</a></p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "service", "stylist_name", "review_link", "booking_link", "business_name"}'),

('Salon Re-engagement', 'salon', 're_engagement',
 'We miss you! Here''s what''s new at {business_name}',
 '<h2>Hi {customer_name}!</h2><p>It''s been a while since we''ve seen you at {business_name}!</p><p>We''ve got some exciting new services and special offers just for you:</p><ul><li>New {service} techniques</li><li>Special discount on your next visit</li><li>Updated salon hours</li></ul><p><a href="{booking_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book Your Appointment</a></p><p>We can''t wait to see you again!<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "service", "booking_link"}'),

-- Med Spa Templates
('Med Spa Review Request', 'medspa', 'review_request',
 'How are you feeling after your {treatment}? Share your experience!',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re seeing great results from your {treatment} with Dr. {provider_name}!</p><p>Your feedback helps us improve our services and helps other patients make informed decisions.</p><p><a href="{review_link}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Share Your Experience</a></p><p>Questions about your treatment? <a href="{contact_link}">Contact us</a></p><p>Best regards,<br>Dr. {provider_name} and the {business_name} Team</p>',
 TRUE, '{"customer_name", "treatment", "provider_name", "review_link", "contact_link", "business_name"}'),

-- Real Estate Templates
('Real Estate Market Update', 'realestate', 'market_update',
 'Weekly market update: {area} real estate insights',
 '<h2>Hi {customer_name}!</h2><p>Here''s your weekly {area} real estate market update:</p><ul><li>Average home price: {avg_price}</li><li>Homes sold this week: {homes_sold}</li><li>Days on market: {days_on_market}</li><li>Interest rates: {interest_rates}</li></ul><p>Interested in buying or selling? <a href="{contact_link}">Let''s talk</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>',
 TRUE, '{"customer_name", "area", "avg_price", "homes_sold", "days_on_market", "interest_rates", "contact_link", "agent_name", "business_name"}'),

-- Home Services Templates
('Home Services Review Request', 'home_services', 'review_request',
 'How was your {service} experience? Your feedback matters!',
 '<h2>Hi {customer_name}!</h2><p>Thank you for choosing {business_name} for your {service}!</p><p>We hope you''re completely satisfied with our work. Your feedback helps us improve and helps other homeowners make informed decisions.</p><p><a href="{review_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Need follow-up service? <a href="{booking_link}">Schedule here</a></p><p>Thank you for your business!<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "service", "review_link", "booking_link"}');

-- ========================================
-- STEP 11: Add Table Comments
-- ========================================

-- Add comments for documentation
COMMENT ON TABLE email_workflow_settings IS 'Stores email workflow configurations and settings for automated email campaigns';
COMMENT ON TABLE email_campaigns IS 'AI-powered email campaigns for different business niches';
COMMENT ON TABLE email_templates IS 'Niche-specific email templates with personalization variables';
COMMENT ON TABLE email_logs IS 'Log of all emails sent with delivery and engagement tracking';
COMMENT ON TABLE automation_triggers IS 'Automation triggers that fire email campaigns based on events';
COMMENT ON TABLE email_unsubscribes IS 'List of unsubscribed email addresses';
COMMENT ON TABLE email_sequences IS 'Multi-step email sequences for complex campaigns';
COMMENT ON TABLE email_personalization_data IS 'Customer personalization data for AI email generation';
COMMENT ON TABLE email_performance_metrics IS 'Daily email performance metrics and analytics';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Email system setup completed successfully!';
    RAISE NOTICE 'Tables created: email_workflow_settings, email_campaigns, email_templates, email_logs, automation_triggers, email_unsubscribes, email_sequences, email_personalization_data, email_performance_metrics';
    RAISE NOTICE 'Indexes, triggers, and RLS policies have been applied';
    RAISE NOTICE 'Default email templates have been inserted';
END $$;
