-- Email Domain Warm-up System for Small Businesses
-- This system helps small businesses build email reputation gradually

-- 1. Email Domains Table
CREATE TABLE IF NOT EXISTS email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL, -- e.g., 'yourbusiness.com'
  subdomain TEXT, -- e.g., 'reviews.yourbusiness.com'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'warming', 'warmed', 'paused', 'suspended')),
  warmup_stage INTEGER DEFAULT 1, -- 1-10 stages
  daily_limit INTEGER DEFAULT 50, -- Current daily sending limit
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_complained INTEGER DEFAULT 0,
  reputation_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
  dkim_verified BOOLEAN DEFAULT FALSE,
  spf_verified BOOLEAN DEFAULT FALSE,
  dmarc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  warmed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Warm-up Schedule Table
CREATE TABLE IF NOT EXISTS warmup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES email_domains(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL, -- 1-10
  daily_limit INTEGER NOT NULL,
  duration_days INTEGER NOT NULL, -- How many days to stay in this stage
  email_types JSONB NOT NULL, -- Types of emails to send in this stage
  content_templates JSONB, -- Templates for this stage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Email Reputation Events
CREATE TABLE IF NOT EXISTS email_reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES email_domains(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('delivered', 'bounced', 'complained', 'opened', 'clicked', 'unsubscribed')),
  event_data JSONB, -- Additional event details
  email_address TEXT,
  message_id TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Warm-up Email Queue
CREATE TABLE IF NOT EXISTS warmup_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES email_domains(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'warmup', 'transactional', 'marketing'
  priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- 5. Small Business Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('warmup', 'followup', 'booking', 'review', 'referral', 'newsletter')),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB, -- Available template variables
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Email Performance Metrics
CREATE TABLE IF NOT EXISTS email_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES email_domains(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_delivered INTEGER DEFAULT 0,
  emails_bounced INTEGER DEFAULT 0,
  emails_complained INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  emails_unsubscribed INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2) DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) DEFAULT 0.00,
  complaint_rate DECIMAL(5,2) DEFAULT 0.00,
  open_rate DECIMAL(5,2) DEFAULT 0.00,
  click_rate DECIMAL(5,2) DEFAULT 0.00,
  reputation_score DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(domain_id, date)
);

-- 7. Insert Default Warm-up Schedule for Small Businesses
INSERT INTO warmup_schedules (stage, daily_limit, duration_days, email_types, content_templates) VALUES
-- Stage 1: Very Conservative Start (Week 1)
(1, 10, 7, '["warmup_intro", "transactional"]', '{"warmup_intro": "Welcome to our business", "transactional": "Order confirmation"}'),

-- Stage 2: Gradual Increase (Week 2)
(2, 25, 7, '["warmup_intro", "transactional", "followup"]', '{"warmup_intro": "Getting to know us", "transactional": "Appointment confirmation", "followup": "Thank you for contacting us"}'),

-- Stage 3: Building Momentum (Week 3)
(3, 50, 7, '["transactional", "followup", "booking_reminder"]', '{"transactional": "Service confirmation", "followup": "How was your experience?", "booking_reminder": "Upcoming appointment reminder"}'),

-- Stage 4: Steady Growth (Week 4)
(4, 100, 7, '["transactional", "followup", "booking_reminder", "review_request"]', '{"transactional": "Service updates", "followup": "Follow-up care", "booking_reminder": "Appointment details", "review_request": "Share your experience"}'),

-- Stage 5: Established Sender (Week 5-6)
(5, 200, 14, '["transactional", "followup", "review_request", "newsletter"]', '{"transactional": "Service notifications", "followup": "Customer care", "review_request": "Leave a review", "newsletter": "Monthly updates"}'),

-- Stage 6: Full Capacity (Week 7+)
(6, 500, 999, '["transactional", "followup", "review_request", "newsletter", "promotional"]', '{"transactional": "All service emails", "followup": "Customer journey", "review_request": "Feedback requests", "newsletter": "Regular updates", "promotional": "Special offers"}');

-- 8. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_email_domains_user_id ON email_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_status ON email_domains(status);
CREATE INDEX IF NOT EXISTS idx_warmup_queue_domain_id ON warmup_email_queue(domain_id);
CREATE INDEX IF NOT EXISTS idx_warmup_queue_scheduled ON warmup_email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_warmup_queue_status ON warmup_email_queue(status);
CREATE INDEX IF NOT EXISTS idx_reputation_events_domain_id ON email_reputation_events(domain_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_type ON email_reputation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_metrics_domain_date ON email_metrics(domain_id, date);

-- 9. Create Function to Calculate Reputation Score
CREATE OR REPLACE FUNCTION calculate_reputation_score(domain_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  total_sent INTEGER;
  total_delivered INTEGER;
  total_bounced INTEGER;
  total_complained INTEGER;
  delivery_rate DECIMAL(5,2);
  bounce_rate DECIMAL(5,2);
  complaint_rate DECIMAL(5,2);
  reputation_score DECIMAL(3,2);
BEGIN
  -- Get email metrics for the domain
  SELECT 
    COALESCE(SUM(emails_sent), 0),
    COALESCE(SUM(emails_delivered), 0),
    COALESCE(SUM(emails_bounced), 0),
    COALESCE(SUM(emails_complained), 0)
  INTO total_sent, total_delivered, total_bounced, total_complained
  FROM email_metrics
  WHERE domain_id = domain_uuid
  AND date >= CURRENT_DATE - INTERVAL '30 days';

  -- Calculate rates
  IF total_sent > 0 THEN
    delivery_rate := (total_delivered::DECIMAL / total_sent::DECIMAL) * 100;
    bounce_rate := (total_bounced::DECIMAL / total_sent::DECIMAL) * 100;
    complaint_rate := (total_complained::DECIMAL / total_sent::DECIMAL) * 100;
  ELSE
    delivery_rate := 0;
    bounce_rate := 0;
    complaint_rate := 0;
  END IF;

  -- Calculate reputation score (0.00 to 1.00)
  reputation_score := 0.5; -- Base score
  
  -- Adjust based on delivery rate
  IF delivery_rate >= 95 THEN
    reputation_score := reputation_score + 0.3;
  ELSIF delivery_rate >= 90 THEN
    reputation_score := reputation_score + 0.2;
  ELSIF delivery_rate >= 80 THEN
    reputation_score := reputation_score + 0.1;
  ELSIF delivery_rate < 70 THEN
    reputation_score := reputation_score - 0.2;
  END IF;

  -- Adjust based on bounce rate
  IF bounce_rate <= 2 THEN
    reputation_score := reputation_score + 0.1;
  ELSIF bounce_rate <= 5 THEN
    reputation_score := reputation_score + 0.05;
  ELSIF bounce_rate > 10 THEN
    reputation_score := reputation_score - 0.2;
  END IF;

  -- Adjust based on complaint rate
  IF complaint_rate <= 0.1 THEN
    reputation_score := reputation_score + 0.1;
  ELSIF complaint_rate <= 0.5 THEN
    reputation_score := reputation_score + 0.05;
  ELSIF complaint_rate > 1.0 THEN
    reputation_score := reputation_score - 0.3;
  END IF;

  -- Ensure score is between 0.00 and 1.00
  reputation_score := GREATEST(0.00, LEAST(1.00, reputation_score));

  RETURN reputation_score;
END;
$$ LANGUAGE plpgsql;

-- 10. Create Function to Get Next Warm-up Stage
CREATE OR REPLACE FUNCTION get_next_warmup_stage(domain_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_stage INTEGER;
  days_in_stage INTEGER;
  stage_duration INTEGER;
  next_stage INTEGER;
BEGIN
  -- Get current stage and days in stage
  SELECT warmup_stage, EXTRACT(DAYS FROM (CURRENT_DATE - created_at))::INTEGER
  INTO current_stage, days_in_stage
  FROM email_domains
  WHERE id = domain_uuid;

  -- Get duration for current stage
  SELECT duration_days
  INTO stage_duration
  FROM warmup_schedules
  WHERE stage = current_stage
  LIMIT 1;

  -- Check if ready to advance
  IF days_in_stage >= stage_duration THEN
    next_stage := current_stage + 1;
  ELSE
    next_stage := current_stage;
  END IF;

  -- Don't exceed stage 6
  next_stage := LEAST(6, next_stage);

  RETURN next_stage;
END;
$$ LANGUAGE plpgsql;

-- 11. Create Trigger to Update Reputation Score
CREATE OR REPLACE FUNCTION update_reputation_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reputation score when metrics change
  UPDATE email_domains
  SET reputation_score = calculate_reputation_score(NEW.domain_id),
      updated_at = NOW()
  WHERE id = NEW.domain_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reputation_score
  AFTER INSERT OR UPDATE ON email_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_reputation_score();

-- 12. Add RLS Policies
ALTER TABLE email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_domains
CREATE POLICY "Users can view their own email domains" ON email_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email domains" ON email_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email domains" ON email_domains
  FOR UPDATE USING (auth.uid() = user_id);

-- Similar policies for other tables...
CREATE POLICY "Users can view their own warmup queue" ON warmup_email_queue
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM email_domains WHERE id = domain_id));

CREATE POLICY "Users can view their own email templates" ON email_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own email templates" ON email_templates
  FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE email_domains IS 'Email domains and their warm-up status for small businesses';
COMMENT ON TABLE warmup_schedules IS 'Predefined warm-up schedules for different stages';
COMMENT ON TABLE email_reputation_events IS 'Real-time email reputation events tracking';
COMMENT ON TABLE warmup_email_queue IS 'Queue of emails to be sent during warm-up process';
COMMENT ON TABLE email_templates IS 'Email templates optimized for small businesses';
COMMENT ON TABLE email_metrics IS 'Daily email performance metrics and reputation scores';
