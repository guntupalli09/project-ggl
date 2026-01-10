-- Multi-Niche Configuration System for GetGetLeads
-- This script creates the database schema for niche-specific configurations

-- 1. Niche Templates Configuration Table
CREATE TABLE IF NOT EXISTS niche_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'salon_barber_spa', 'home_services', 'med_spa'
  display_name TEXT NOT NULL, -- 'Salon/Barber/Spa', 'Home Services', 'Med Spa'
  description TEXT,
  config JSONB NOT NULL, -- All niche-specific settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add niche configuration to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS niche_template_id UUID REFERENCES niche_templates(id),
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS sending_domain TEXT,
ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'new'; -- new, booked, completed, review_sent, referral_sent

-- 3. Enhanced Lead Tracking with Niche Metadata
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS niche_metadata JSONB, -- Service type, technician, location, etc.
ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'new'; -- new, booked, completed, review_sent, referral_sent

-- 4. Review/Feedback System (HIPAA-compliant)
CREATE TABLE IF NOT EXISTS feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('review', 'feedback')), -- 'review' or 'feedback'
  delay_hours INTEGER NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'failed')),
  message_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Referral System
CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Subdomain Management
CREATE TABLE IF NOT EXISTS tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subdomain TEXT UNIQUE NOT NULL,
  sending_domain TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  dns_verified BOOLEAN DEFAULT false,
  ssl_certificate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Workflow Automation Logs
CREATE TABLE IF NOT EXISTS workflow_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'review_request', 'referral_sent', 'follow_up'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_niche_templates_name ON niche_templates(name);
CREATE INDEX IF NOT EXISTS idx_user_settings_niche_template ON user_settings(niche_template_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_subdomain ON user_settings(subdomain);
CREATE INDEX IF NOT EXISTS idx_leads_workflow_stage ON leads(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_leads_niche_metadata ON leads USING GIN (niche_metadata);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_scheduled ON feedback_requests(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_feedback_requests_user_lead ON feedback_requests(user_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_token ON referral_links(token);
CREATE INDEX IF NOT EXISTS idx_referral_links_user ON referral_links(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_subdomain ON tenant_domains(subdomain);
CREATE INDEX IF NOT EXISTS idx_workflow_automations_scheduled ON workflow_automations(scheduled_for) WHERE status = 'pending';

-- 9. RLS Policies for multi-tenant security
ALTER TABLE niche_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_automations ENABLE ROW LEVEL SECURITY;

-- Niche templates are public (read-only for users)
CREATE POLICY "Anyone can view niche templates" ON niche_templates
  FOR SELECT USING (true);

-- Users can only access their own data
CREATE POLICY "Users can view their own feedback requests" ON feedback_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own referral links" ON referral_links
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tenant domains" ON tenant_domains
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own workflow automations" ON workflow_automations
  FOR ALL USING (auth.uid() = user_id);

-- 10. Insert default niche templates
INSERT INTO niche_templates (name, display_name, description, config) VALUES
(
  'salon_barber_spa',
  'Salon/Barber/Spa',
  'Perfect for hair salons, barbershops, spas, and beauty services',
  '{
    "review_delay_hours": 2,
    "referral_delay_hours": 24,
    "workflow_stages": ["new", "booked", "completed", "review_sent", "referral_sent"],
    "email_templates": {
      "review_request": "salon_review_template",
      "referral_offer": "salon_referral_template"
    },
    "metadata_fields": ["service_type", "stylist_name", "appointment_duration"],
    "compliance": "standard",
    "subdomain_template": "{business_name}.getgetleads.com",
    "branding": {
      "primary_color": "#8B5CF6",
      "secondary_color": "#A78BFA",
      "icon": "scissors"
    },
    "automation_rules": {
      "immediate_review": true,
      "instant_referral_link": true,
      "photo_upload_required": false
    }
  }'
),
(
  'home_services',
  'Home Services',
  'Ideal for plumbers, electricians, HVAC, cleaning services, and contractors',
  '{
    "review_delay_hours": 8,
    "referral_delay_hours": 48,
    "workflow_stages": ["new", "booked", "completed", "review_sent", "referral_sent"],
    "email_templates": {
      "review_request": "home_services_review_template",
      "referral_offer": "home_services_referral_template"
    },
    "metadata_fields": ["service_type", "technician_name", "location", "before_photos", "after_photos"],
    "compliance": "standard",
    "subdomain_template": "{business_name}.getgetleads.com",
    "branding": {
      "primary_color": "#059669",
      "secondary_color": "#10B981",
      "icon": "home"
    },
    "automation_rules": {
      "immediate_review": false,
      "instant_referral_link": false,
      "photo_upload_required": true
    }
  }'
),
(
  'med_spa',
  'Med Spa/Aesthetic Clinic',
  'Designed for medical spas, aesthetic clinics, and healthcare services',
  '{
    "review_delay_hours": 24,
    "referral_delay_hours": 72,
    "workflow_stages": ["new", "booked", "completed", "feedback_sent", "referral_sent"],
    "email_templates": {
      "review_request": "med_spa_feedback_template",
      "referral_offer": "med_spa_referral_template"
    },
    "metadata_fields": ["service_type", "practitioner_name", "treatment_area", "consultation_notes"],
    "compliance": "hipaa",
    "subdomain_template": "{business_name}.getgetleads.com",
    "branding": {
      "primary_color": "#DC2626",
      "secondary_color": "#EF4444",
      "icon": "heart"
    },
    "automation_rules": {
      "immediate_review": false,
      "instant_referral_link": false,
      "photo_upload_required": false,
      "hipaa_compliant": true,
      "anonymize_data": true
    }
  }'
) ON CONFLICT (name) DO NOTHING;

-- 11. Create function to generate subdomain
CREATE OR REPLACE FUNCTION generate_subdomain(business_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_subdomain TEXT;
  final_subdomain TEXT;
  counter INTEGER := 0;
BEGIN
  -- Clean business name: lowercase, remove special chars, replace spaces with hyphens
  base_subdomain := lower(regexp_replace(business_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_subdomain := regexp_replace(base_subdomain, '\s+', '-', 'g');
  base_subdomain := regexp_replace(base_subdomain, '-+', '-', 'g');
  base_subdomain := trim(both '-' from base_subdomain);
  
  -- Limit length
  IF length(base_subdomain) > 30 THEN
    base_subdomain := left(base_subdomain, 30);
  END IF;
  
  final_subdomain := base_subdomain;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM user_settings WHERE subdomain = final_subdomain) LOOP
    counter := counter + 1;
    final_subdomain := base_subdomain || '-' || counter;
  END LOOP;
  
  RETURN final_subdomain;
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to handle lead workflow automation
CREATE OR REPLACE FUNCTION handle_lead_workflow()
RETURNS TRIGGER AS $$
DECLARE
  niche_config JSONB;
  delay_hours INTEGER;
  workflow_stage TEXT;
  feedback_type TEXT;
BEGIN
  -- Get niche configuration
  SELECT nt.config INTO niche_config
  FROM niche_templates nt
  JOIN user_settings us ON nt.id = us.niche_template_id
  WHERE us.user_id = NEW.user_id;
  
  -- If no niche config found, use default
  IF niche_config IS NULL THEN
    niche_config := '{"review_delay_hours": 24, "referral_delay_hours": 48, "compliance": "standard"}'::jsonb;
  END IF;
  
  -- Determine next stage and delay based on status change
  CASE NEW.status
    WHEN 'booked' THEN
      workflow_stage := 'completed';
      delay_hours := (niche_config->>'review_delay_hours')::INTEGER;
      
      -- Determine feedback type based on compliance
      feedback_type := CASE 
        WHEN (niche_config->>'compliance') = 'hipaa' THEN 'feedback' 
        ELSE 'review' 
      END;
      
      -- Schedule review/feedback request
      INSERT INTO feedback_requests (user_id, lead_id, type, delay_hours, scheduled_for)
      VALUES (NEW.user_id, NEW.id, feedback_type, delay_hours, 
              NOW() + (delay_hours || ' hours')::INTERVAL);
      
    WHEN 'completed' THEN
      workflow_stage := 'review_sent';
      -- Trigger review/feedback sending (this would be handled by a background job)
      INSERT INTO workflow_automations (user_id, lead_id, action_type, status, scheduled_for)
      VALUES (NEW.user_id, NEW.id, 'review_request', 'pending', NOW());
      
    WHEN 'review_sent' THEN
      workflow_stage := 'referral_sent';
      delay_hours := (niche_config->>'referral_delay_hours')::INTEGER;
      
      -- Generate referral link
      INSERT INTO referral_links (user_id, lead_id, token, expires_at)
      VALUES (NEW.user_id, NEW.id, gen_random_uuid()::TEXT, NOW() + '30 days'::INTERVAL);
      
      -- Schedule referral email
      INSERT INTO workflow_automations (user_id, lead_id, action_type, status, scheduled_for)
      VALUES (NEW.user_id, NEW.id, 'referral_offer', 'pending', 
              NOW() + (delay_hours || ' hours')::INTERVAL);
  END CASE;
  
  -- Update lead workflow stage
  UPDATE leads SET workflow_stage = workflow_stage WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger for lead status changes
DROP TRIGGER IF EXISTS lead_workflow_trigger ON leads;
CREATE TRIGGER lead_workflow_trigger
  AFTER UPDATE OF status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION handle_lead_workflow();

-- 14. Create function to get user's niche configuration
CREATE OR REPLACE FUNCTION get_user_niche_config(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  niche_config JSONB;
BEGIN
  SELECT nt.config INTO niche_config
  FROM niche_templates nt
  JOIN user_settings us ON nt.id = us.niche_template_id
  WHERE us.user_id = user_uuid;
  
  RETURN COALESCE(niche_config, '{"compliance": "standard"}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 15. Create function to validate subdomain uniqueness
CREATE OR REPLACE FUNCTION validate_subdomain(subdomain_text TEXT, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if subdomain is already taken by another user
  RETURN NOT EXISTS (
    SELECT 1 FROM user_settings 
    WHERE subdomain = subdomain_text 
    AND user_id != user_uuid
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE niche_templates IS 'Configuration templates for different business niches';
COMMENT ON TABLE feedback_requests IS 'Scheduled review/feedback requests with HIPAA compliance support';
COMMENT ON TABLE referral_links IS 'Generated referral links for lead generation';
COMMENT ON TABLE tenant_domains IS 'Subdomain management for multi-tenant architecture';
COMMENT ON TABLE workflow_automations IS 'Automation logs and scheduling for lead workflows';
