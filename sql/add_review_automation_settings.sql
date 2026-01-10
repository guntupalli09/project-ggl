-- Add review and referral automation settings to user_settings table

-- Add new columns to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS review_automation_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS referral_automation_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS review_request_delay_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS referral_request_delay_hours INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS review_follow_up_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS referral_incentive_text TEXT DEFAULT 'Thank you for referring us! We''ll give you 10% off your next service.',
ADD COLUMN IF NOT EXISTS google_reviews_url TEXT,
ADD COLUMN IF NOT EXISTS yelp_reviews_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_reviews_url TEXT;

-- Update existing records to have default values
UPDATE public.user_settings 
SET 
  review_automation_enabled = TRUE,
  referral_automation_enabled = TRUE,
  review_request_delay_hours = 24,
  referral_request_delay_hours = 48,
  review_follow_up_days = 7,
  referral_incentive_text = 'Thank you for referring us! We''ll give you 10% off your next service.'
WHERE review_automation_enabled IS NULL;
