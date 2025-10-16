-- Reset user onboarding data to allow fresh onboarding experience
-- This will clear the test data and allow the user to go through onboarding again

UPDATE user_settings 
SET 
  niche_template_id = NULL,
  custom_domain = NULL,
  business_slug = NULL,
  workflow_stage = 'new',
  updated_at = NOW()
WHERE user_id = 'be84619d-f7ec-4dc1-ac91-ee62236e7549';

-- Verify the update
SELECT user_id, niche_template_id, custom_domain, business_slug, workflow_stage 
FROM user_settings 
WHERE user_id = 'be84619d-f7ec-4dc1-ac91-ee62236e7549';

