-- Email Automation System Database Schema (FIXED VERSION)
-- Integrates with existing automation and provides AI-powered email campaigns

-- 1. Email Campaigns Table
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

-- 2. Automation Triggers Table
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

-- 3. Email Logs Table
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

-- 4. Email Unsubscribes Table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  campaign_type TEXT,
  reason TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- 5. Email Templates Table (for niche-specific templates)
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

-- 6. Email Sequences Table (for multi-step campaigns)
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  steps JSONB NOT NULL, -- Array of email steps with delays
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Email Personalization Data Table
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

-- 8. Email Performance Metrics Table
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

-- 9. Insert Default Niche Templates (FIXED - removed user_id from INSERT)
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

('Med Spa Educational', 'medspa', 'educational',
 'Preparing for your {treatment} consultation - What to expect',
 '<h2>Hi {customer_name}!</h2><p>Thank you for scheduling your {treatment} consultation with Dr. {provider_name}!</p><p>To help you prepare, here''s what to expect:</p><ul><li>Consultation duration: {duration}</li><li>What to bring: {required_items}</li><li>Pre-treatment instructions: {pre_instructions}</li></ul><p>Questions? <a href="{contact_link}">Contact us</a></p><p>We look forward to seeing you on {appointment_date}!<br>Dr. {provider_name} and the {business_name} Team</p>',
 TRUE, '{"customer_name", "treatment", "provider_name", "duration", "required_items", "pre_instructions", "contact_link", "appointment_date", "business_name"}'),

-- Real Estate Templates
('Real Estate Market Update', 'realestate', 'market_update',
 'Weekly market update: {area} real estate insights',
 '<h2>Hi {customer_name}!</h2><p>Here''s your weekly {area} real estate market update:</p><ul><li>Average home price: {avg_price}</li><li>Homes sold this week: {homes_sold}</li><li>Days on market: {days_on_market}</li><li>Interest rates: {interest_rates}</li></ul><p>Interested in buying or selling? <a href="{contact_link}">Let''s talk</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>',
 TRUE, '{"customer_name", "area", "avg_price", "homes_sold", "days_on_market", "interest_rates", "contact_link", "agent_name", "business_name"}'),

('Real Estate Open House', 'realestate', 'open_house',
 'Open house this weekend: {property_address}',
 '<h2>Hi {customer_name}!</h2><p>Don''t miss this amazing opportunity!</p><p><strong>{property_address}</strong></p><ul><li>Price: {property_price}</li><li>Bedrooms: {bedrooms}</li><li>Bathrooms: {bathrooms}</li><li>Square feet: {sqft}</li></ul><p><strong>Open House:</strong> {open_house_date} from {open_house_time}</p><p><a href="{property_link}" style="background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Property Details</a></p><p>Questions? <a href="{contact_link}">Contact me</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>',
 TRUE, '{"customer_name", "property_address", "property_price", "bedrooms", "bathrooms", "sqft", "open_house_date", "open_house_time", "property_link", "contact_link", "agent_name", "business_name"}'),

-- Home Services Templates
('Home Services Review Request', 'home_services', 'review_request',
 'How was your {service} experience? Your feedback matters!',
 '<h2>Hi {customer_name}!</h2><p>Thank you for choosing {business_name} for your {service}!</p><p>We hope you''re completely satisfied with our work. Your feedback helps us improve and helps other homeowners make informed decisions.</p><p><a href="{review_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Need follow-up service? <a href="{booking_link}">Schedule here</a></p><p>Thank you for your business!<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "business_name", "service", "review_link", "booking_link"}'),

('Home Services Maintenance Reminder', 'home_services', 'maintenance_reminder',
 'Time for your {service} maintenance - Schedule today!',
 '<h2>Hi {customer_name}!</h2><p>It''s time for your {service} maintenance!</p><p>Regular maintenance helps prevent costly repairs and keeps your {service} running efficiently.</p><p><strong>Last Service:</strong> {last_service_date}</p><p><strong>Recommended Next Service:</strong> {next_service_date}</p><p><a href="{booking_link}" style="background: #FF5722; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Schedule Maintenance</a></p><p>Questions? <a href="{contact_link}">Contact us</a></p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '{"customer_name", "service", "last_service_date", "next_service_date", "booking_link", "contact_link", "business_name"}');

-- 10. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_niche ON email_campaigns(niche);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_user_id ON automation_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_event ON automation_triggers(event);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_active ON automation_triggers(is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_customer_email ON email_logs(customer_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_type ON email_logs(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_email ON email_unsubscribes(user_id, email);
CREATE INDEX IF NOT EXISTS idx_email_templates_niche ON email_templates(niche);
CREATE INDEX IF NOT EXISTS idx_email_templates_campaign_type ON email_templates(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_performance_metrics_user_date ON email_performance_metrics(user_id, date);

-- 11. Create Functions for Email Automation
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

-- 12. Create Trigger to Update Metrics
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

-- 13. Add RLS Policies
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_personalization_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own email campaigns" ON email_campaigns
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own automation triggers" ON automation_triggers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own unsubscribes" ON email_unsubscribes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own email templates" ON email_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own email sequences" ON email_sequences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own personalization data" ON email_personalization_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own performance metrics" ON email_performance_metrics
  FOR ALL USING (auth.uid() = user_id);

-- 14. Comments (using proper PostgreSQL syntax)
COMMENT ON TABLE email_campaigns IS 'AI-powered email campaigns for different business niches';
COMMENT ON TABLE automation_triggers IS 'Automation triggers that fire email campaigns based on events';
COMMENT ON TABLE email_logs IS 'Log of all emails sent with delivery and engagement tracking';
COMMENT ON TABLE email_unsubscribes IS 'List of unsubscribed email addresses';
COMMENT ON TABLE email_templates IS 'Niche-specific email templates with personalization variables';
COMMENT ON TABLE email_sequences IS 'Multi-step email sequences for complex campaigns';
COMMENT ON TABLE email_personalization_data IS 'Customer personalization data for AI email generation';
COMMENT ON TABLE email_performance_metrics IS 'Daily email performance metrics and analytics';
