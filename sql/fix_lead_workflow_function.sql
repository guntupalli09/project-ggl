-- Fix the handle_lead_workflow function to handle all status values
-- This fixes the "case not found" error when updating leads

CREATE OR REPLACE FUNCTION handle_lead_workflow()
RETURNS TRIGGER AS $$
DECLARE
  niche_config JSONB;
  delay_hours INTEGER;
  new_workflow_stage TEXT;
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
  IF NEW.status = 'booked' THEN
    new_workflow_stage := 'completed';
    delay_hours := (niche_config->>'review_delay_hours')::INTEGER;
    
    -- Determine feedback type based on compliance
    IF (niche_config->>'compliance') = 'hipaa' THEN
      feedback_type := 'feedback';
    ELSE
      feedback_type := 'review';
    END IF;
    
    -- Schedule review/feedback request
    INSERT INTO feedback_requests (user_id, lead_id, type, delay_hours, scheduled_for)
    VALUES (NEW.user_id, NEW.id, feedback_type, delay_hours, 
            NOW() + (delay_hours || ' hours')::INTERVAL);
            
  ELSIF NEW.status = 'completed' THEN
    new_workflow_stage := 'review_sent';
    -- Trigger review/feedback sending (this would be handled by a background job)
    INSERT INTO workflow_automations (user_id, lead_id, trigger_event, action_type, status, scheduled_for)
    VALUES (NEW.user_id, NEW.id, 'booking_completed', 'review_request', 'pending', NOW());
    
  ELSIF NEW.status = 'review_sent' THEN
    new_workflow_stage := 'referral_sent';
    delay_hours := (niche_config->>'referral_delay_hours')::INTEGER;
    
    -- Generate referral link
    INSERT INTO referral_links (user_id, lead_id, token, expires_at)
    VALUES (NEW.user_id, NEW.id, gen_random_uuid()::TEXT, NOW() + '30 days'::INTERVAL);
    
    -- Schedule referral email
    INSERT INTO workflow_automations (user_id, lead_id, trigger_event, action_type, status, scheduled_for)
    VALUES (NEW.user_id, NEW.id, 'review_received', 'referral_offer', 'pending', 
            NOW() + (delay_hours || ' hours')::INTERVAL);
            
  ELSE
    -- Handle all other status values (new, contacted, etc.)
    -- Just update the workflow stage to match the status
    new_workflow_stage := NEW.status;
  END IF;
  
  -- Update lead workflow stage
  UPDATE leads SET workflow_stage = new_workflow_stage WHERE leads.id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
