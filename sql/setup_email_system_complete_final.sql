-- Complete Email System Setup with Column Creation
-- This script first adds missing columns, then creates the email system

-- ========================================
-- STEP 1: Add Missing Columns to Existing Tables
-- ========================================

-- Add niche and business_type columns to user_settings if they don't exist
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS niche VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);

-- Add comments for the new columns
COMMENT ON COLUMN public.user_settings.niche IS 'Business niche classification (e.g., beauty, healthcare, real_estate)';
COMMENT ON COLUMN public.user_settings.business_type IS 'Specific business type (e.g., salon, medspa, realestate)';

-- ========================================
-- STEP 2: Create Email Workflows Table
-- ========================================

-- Create email_workflow_settings table (using auth.users and existing structure)
CREATE TABLE IF NOT EXISTS email_workflow_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(100) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  niche VARCHAR(100), -- Added niche column for business type classification
  business_type VARCHAR(100), -- Added business_type column for industry classification
  is_active BOOLEAN DEFAULT false,
  is_ai_enhanced BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STEP 3: Create Email Logs Table
-- ========================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  niche VARCHAR(100), -- Added niche column for tracking
  business_type VARCHAR(100), -- Added business_type column for tracking
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
-- STEP 4: Create Email Templates Table with Important Columns
-- ========================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche VARCHAR(100), -- Added niche column for business type classification
  business_type VARCHAR(100), -- Added business_type column for industry classification
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
-- STEP 5: Create Email Campaigns Table
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
  niche VARCHAR(100), -- Added niche column for business type classification
  business_type VARCHAR(100), -- Added business_type column for industry classification
  subject_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metrics JSONB DEFAULT '{}'::jsonb
);

-- ========================================
-- STEP 6: Create Basic Indexes
-- ========================================

-- User Settings Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_settings_niche ON public.user_settings(niche);
CREATE INDEX IF NOT EXISTS idx_user_settings_business_type ON public.user_settings(business_type);

-- Email Workflow Settings Indexes
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_user_id ON email_workflow_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_campaign_type ON email_workflow_settings(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_trigger_event ON email_workflow_settings(trigger_event);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_is_active ON email_workflow_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_niche ON email_workflow_settings(niche);
CREATE INDEX IF NOT EXISTS idx_email_workflow_settings_business_type ON email_workflow_settings(business_type);

-- Email Logs Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer_email ON email_logs(customer_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_type ON email_logs(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_niche ON email_logs(niche);
CREATE INDEX IF NOT EXISTS idx_email_logs_business_type ON email_logs(business_type);

-- Email Templates Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_campaign_type ON email_templates(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_niche ON email_templates(niche);
CREATE INDEX IF NOT EXISTS idx_email_templates_business_type ON email_templates(business_type);

-- Email Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_niche ON email_campaigns(niche);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_business_type ON email_campaigns(business_type);

-- ========================================
-- STEP 7: Create Updated_at Trigger
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

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at 
    BEFORE UPDATE ON email_campaigns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 8: Enable Row Level Security
-- ========================================

-- Enable RLS on all tables
ALTER TABLE email_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

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

-- Email Logs Policies
CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR ALL USING (auth.uid() = user_id);

-- Email Templates Policies
CREATE POLICY "Users can manage their own email templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);

-- Email Campaigns Policies
CREATE POLICY "Users can manage their own email campaigns" ON email_campaigns
    FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- STEP 10: Insert Default Templates with Niche and Business Type
-- ========================================

-- Insert default email templates with niche and business_type classification
INSERT INTO email_templates (name, niche, business_type, campaign_type, subject_template, content_template, is_default, variables) VALUES
-- Salon Templates
('Salon Review Request', 'beauty', 'salon', 'review_request', 
 'How did you love your {service}? We''d love to hear about it!',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re loving your new {service} from {stylist_name}!</p><p>Your feedback means everything to us and helps other clients discover our services.</p><p><a href="{review_link}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to book your next appointment? <a href="{booking_link}">Click here</a></p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "service", "stylist_name", "review_link", "booking_link", "business_name"}'),

('Salon Re-engagement', 'beauty', 'salon', 're_engagement',
 'We miss you! Here''s what''s new at {business_name}',
 '<h2>Hi {customer_name}!</h2><p>It''s been a while since we''ve seen you at {business_name}!</p><p>We''ve got some exciting new services and special offers just for you:</p><ul><li>New {service} techniques</li><li>Special discount on your next visit</li><li>Updated salon hours</li></ul><p><a href="{booking_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book Your Appointment</a></p><p>We can''t wait to see you again!<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "service", "booking_link"}'),

-- Med Spa Templates
('Med Spa Review Request', 'healthcare', 'medspa', 'review_request',
 'How are you feeling after your {treatment}? Share your experience!',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re seeing great results from your {treatment} with Dr. {provider_name}!</p><p>Your feedback helps us improve our services and helps other patients make informed decisions.</p><p><a href="{review_link}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Share Your Experience</a></p><p>Questions about your treatment? <a href="{contact_link}">Contact us</a></p><p>Best regards,<br>Dr. {provider_name} and the {business_name} Team</p>',
 TRUE, '{"customer_name", "treatment", "provider_name", "review_link", "contact_link", "business_name"}'),

-- Real Estate Templates
('Real Estate Market Update', 'real_estate', 'realestate', 'market_update',
 'Weekly market update: {area} real estate insights',
 '<h2>Hi {customer_name}!</h2><p>Here''s your weekly {area} real estate market update:</p><ul><li>Average home price: {avg_price}</li><li>Homes sold this week: {homes_sold}</li><li>Days on market: {days_on_market}</li><li>Interest rates: {interest_rates}</li></ul><p>Interested in buying or selling? <a href="{contact_link}">Let''s talk</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>',
 TRUE, '{"customer_name", "area", "avg_price", "homes_sold", "days_on_market", "interest_rates", "contact_link", "agent_name", "business_name"}'),

-- Home Services Templates
('Home Services Review Request', 'home_services', 'homeservices', 'review_request',
 'How was your {service} experience? Your feedback matters!',
 '<h2>Hi {customer_name}!</h2><p>Thank you for choosing {business_name} for your {service}!</p><p>We hope you''re completely satisfied with our work. Your feedback helps us improve and helps other homeowners make informed decisions.</p><p><a href="{review_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Need follow-up service? <a href="{booking_link}">Schedule here</a></p><p>Thank you for your business!<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "service", "review_link", "booking_link"}'),

-- Restaurant Templates
('Restaurant Review Request', 'food_service', 'restaurant', 'review_request',
 'How was your dining experience at {business_name}?',
 '<h2>Hi {customer_name}!</h2><p>Thank you for dining with us at {business_name}!</p><p>We hope you enjoyed your meal and the service. Your feedback helps us improve and helps other diners discover our restaurant.</p><p><a href="{review_link}" style="background: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to make another reservation? <a href="{booking_link}">Book here</a></p><p>Thank you for choosing {business_name}!<br>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "review_link", "booking_link"}'),

-- Retail Templates
('Retail Review Request', 'retail', 'retail', 'review_request',
 'How was your shopping experience at {business_name}?',
 '<h2>Hi {customer_name}!</h2><p>Thank you for shopping with us at {business_name}!</p><p>We hope you''re happy with your purchase. Your feedback helps us improve and helps other customers discover our products.</p><p><a href="{review_link}" style="background: #9C27B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to shop again? <a href="{website_link}">Visit our store</a></p><p>Thank you for your business!<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "review_link", "website_link"}');

-- ========================================
-- STEP 11: Add Table Comments
-- ========================================

-- Add comments for documentation
COMMENT ON TABLE email_workflow_settings IS 'Stores email workflow configurations and settings for automated email campaigns with niche and business_type classification';
COMMENT ON TABLE email_logs IS 'Log of all emails sent with delivery and engagement tracking, including niche and business_type for analytics';
COMMENT ON TABLE email_templates IS 'Niche and business-type specific email templates with personalization variables';
COMMENT ON TABLE email_campaigns IS 'AI-powered email campaigns for different business niches and types';

-- Add column comments
COMMENT ON COLUMN email_workflow_settings.niche IS 'Business niche classification (e.g., beauty, healthcare, real_estate)';
COMMENT ON COLUMN email_workflow_settings.business_type IS 'Specific business type (e.g., salon, medspa, realestate)';
COMMENT ON COLUMN email_logs.niche IS 'Business niche for tracking and analytics';
COMMENT ON COLUMN email_logs.business_type IS 'Business type for tracking and analytics';
COMMENT ON COLUMN email_templates.niche IS 'Business niche this template is designed for';
COMMENT ON COLUMN email_templates.business_type IS 'Specific business type this template is designed for';
COMMENT ON COLUMN email_campaigns.niche IS 'Business niche this campaign targets';
COMMENT ON COLUMN email_campaigns.business_type IS 'Specific business type this campaign targets';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Email system setup completed successfully!';
    RAISE NOTICE 'Added niche and business_type columns to user_settings table';
    RAISE NOTICE 'Tables created: email_workflow_settings, email_logs, email_templates, email_campaigns';
    RAISE NOTICE 'Added niche and business_type columns for better organization and analytics';
    RAISE NOTICE 'Indexes, triggers, and RLS policies have been applied';
    RAISE NOTICE 'Default email templates have been inserted with niche and business_type classification';
    RAISE NOTICE 'Ready for advanced email marketing with industry-specific targeting!';
END $$;
