-- Workflow Automation System Migration
-- This script creates the necessary tables for niche-specific workflow automation

-- 1. Create workflow_automations table
CREATE TABLE IF NOT EXISTS workflow_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_template_id UUID REFERENCES niche_templates(id) NOT NULL,
  trigger_event TEXT NOT NULL, -- 'booking_completed', 'review_received', 'lead_created'
  delay_minutes INTEGER DEFAULT 0,
  action_type TEXT NOT NULL, -- 'send_review_request', 'send_referral_offer', 'update_lead_status'
  template_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_lead_id UUID REFERENCES leads(id) NOT NULL,
  referee_lead_id UUID REFERENCES leads(id),
  referral_code TEXT UNIQUE NOT NULL,
  link_url TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  reward_amount DECIMAL(10,2) DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id),
  booking_id UUID REFERENCES bookings(id),
  action_type TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add service completion fields to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS service_completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS service_notes TEXT;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_automations_niche_template_id ON workflow_automations(niche_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_automations_trigger_event ON workflow_automations(trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_automations_is_active ON workflow_automations(is_active);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_lead_id ON referrals(referrer_lead_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_lead_id ON automation_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_booking_id ON automation_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed_at ON automation_logs(executed_at);

CREATE INDEX IF NOT EXISTS idx_bookings_service_completed_at ON bookings(service_completed_at);
CREATE INDEX IF NOT EXISTS idx_bookings_service_completed_by ON bookings(service_completed_by);

-- 6. Enable RLS
ALTER TABLE workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Allow public read access to workflow_automations" ON workflow_automations
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage their own referrals" ON referrals
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM leads WHERE id = referrer_lead_id
  )) WITH CHECK (auth.uid() IN (
    SELECT user_id FROM leads WHERE id = referrer_lead_id
  ));

CREATE POLICY "Users can view their own automation logs" ON automation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert automation logs" ON automation_logs
  FOR INSERT WITH CHECK (TRUE);

-- 8. Insert default workflow automations for each niche
INSERT INTO workflow_automations (niche_template_id, trigger_event, delay_minutes, action_type, is_active) 
SELECT 
  nt.id,
  'booking_completed',
  CASE 
    WHEN nt.name = 'salon_barber_spa' THEN 120  -- 2 hours
    WHEN nt.name = 'home_services' THEN 360     -- 6 hours  
    WHEN nt.name = 'med_spa' THEN 1440          -- 24 hours
    ELSE 120
  END,
  'send_review_request',
  true
FROM niche_templates nt
WHERE nt.name IN ('salon_barber_spa', 'home_services', 'med_spa');

INSERT INTO workflow_automations (niche_template_id, trigger_event, delay_minutes, action_type, is_active) 
SELECT 
  nt.id,
  'review_received',
  0,
  'send_referral_offer',
  true
FROM niche_templates nt
WHERE nt.name IN ('salon_barber_spa', 'home_services', 'med_spa');

INSERT INTO workflow_automations (niche_template_id, trigger_event, delay_minutes, action_type, is_active) 
SELECT 
  nt.id,
  'lead_created',
  0,
  'update_lead_status',
  true
FROM niche_templates nt
WHERE nt.name IN ('salon_barber_spa', 'home_services', 'med_spa');

-- 9. Add comments for documentation
COMMENT ON TABLE workflow_automations IS 'Defines automation rules for each niche template';
COMMENT ON TABLE referrals IS 'Tracks referral links and rewards for customers';
COMMENT ON TABLE automation_logs IS 'Logs all automation executions for debugging and analytics';

COMMENT ON COLUMN workflow_automations.trigger_event IS 'Event that triggers the automation (booking_completed, review_received, etc.)';
COMMENT ON COLUMN workflow_automations.delay_minutes IS 'Delay in minutes before executing the automation';
COMMENT ON COLUMN workflow_automations.action_type IS 'Type of action to execute (send_review_request, send_referral_offer, etc.)';

COMMENT ON COLUMN referrals.referral_code IS 'Unique code for the referral link';
COMMENT ON COLUMN referrals.reward_amount IS 'Reward amount for successful referrals';

COMMENT ON COLUMN automation_logs.action_type IS 'Type of automation action that was executed';
COMMENT ON COLUMN automation_logs.data IS 'Additional data passed to the automation';
COMMENT ON COLUMN automation_logs.status IS 'Execution status of the automation';

-- 10. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Create triggers for updated_at
CREATE TRIGGER update_workflow_automations_updated_at 
    BEFORE UPDATE ON workflow_automations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at 
    BEFORE UPDATE ON referrals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
