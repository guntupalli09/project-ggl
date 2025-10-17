-- Fix email_templates table structure - CORRECTED VERSION
-- This script handles the actual table structure with template_name column

-- ========================================
-- STEP 1: Check current table structure
-- ========================================

-- First, let's see what columns actually exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'email_templates' 
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: Add missing columns if needed
-- ========================================

-- Add niche and business_type columns if they don't exist
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS niche VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ========================================
-- STEP 3: Update existing records to have proper template_name values
-- ========================================

-- If template_name is null, set it based on campaign_type
UPDATE email_templates 
SET template_name = CASE 
    WHEN campaign_type = 'review_request' THEN 'Review Request Template'
    WHEN campaign_type = 're_engagement' THEN 'Re-engagement Template'
    WHEN campaign_type = 'welcome' THEN 'Welcome Series Template'
    WHEN campaign_type = 'appointment_reminder' THEN 'Appointment Reminder Template'
    WHEN campaign_type = 'educational' THEN 'Educational Content Template'
    WHEN campaign_type = 'market_update' THEN 'Market Update Template'
    WHEN campaign_type = 'open_house' THEN 'Open House Template'
    WHEN campaign_type = 'lead_nurturing' THEN 'Lead Nurturing Template'
    WHEN campaign_type = 'maintenance_reminder' THEN 'Maintenance Reminder Template'
    WHEN campaign_type = 'follow_up' THEN 'Follow-up Template'
    WHEN campaign_type = 'treatment_plan' THEN 'Treatment Plan Template'
    ELSE 'Email Template'
END
WHERE template_name IS NULL;

-- ========================================
-- STEP 4: Set default values for niche and business_type
-- ========================================

-- Set default values for existing records
UPDATE email_templates 
SET niche = 'general',
    business_type = 'general'
WHERE niche IS NULL OR business_type IS NULL;

-- ========================================
-- STEP 5: Now insert the default templates safely
-- ========================================

-- Insert default templates only if they don't already exist
INSERT INTO email_templates (template_name, niche, business_type, campaign_type, subject_template, content_template, is_default, variables) 
SELECT * FROM (VALUES
-- Salon Templates
('Salon Review Request', 'beauty', 'salon', 'review_request', 
 'How did you love your {service}? We''d love to hear about it!',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re loving your new {service} from {stylist_name}!</p><p>Your feedback means everything to us and helps other clients discover our services.</p><p><a href="{review_link}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to book your next appointment? <a href="{booking_link}">Click here</a></p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '["customer_name", "service", "stylist_name", "review_link", "booking_link", "business_name"]'::jsonb),

('Salon Re-engagement', 'beauty', 'salon', 're_engagement',
 'We miss you! Here''s what''s new at {business_name}',
 '<h2>Hi {customer_name}!</h2><p>It''s been a while since we''ve seen you at {business_name}!</p><p>We''ve got some exciting new services and special offers just for you:</p><ul><li>New {service} techniques</li><li>Special discount on your next visit</li><li>Updated salon hours</li></ul><p><a href="{booking_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book Your Appointment</a></p><p>We can''t wait to see you again!<br>{business_name} Team</p>',
 TRUE, '["customer_name", "business_name", "service", "booking_link"]'::jsonb),

-- Med Spa Templates
('Med Spa Review Request', 'healthcare', 'medspa', 'review_request',
 'How are you feeling after your {treatment}? Share your experience!',
 '<h2>Hi {customer_name}!</h2><p>We hope you''re seeing great results from your {treatment} with Dr. {provider_name}!</p><p>Your feedback helps us improve our services and helps other patients make informed decisions.</p><p><a href="{review_link}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Share Your Experience</a></p><p>Questions about your treatment? <a href="{contact_link}">Contact us</a></p><p>Best regards,<br>Dr. {provider_name} and the {business_name} Team</p>',
 TRUE, '["customer_name", "treatment", "provider_name", "review_link", "contact_link", "business_name"]'::jsonb),

('Med Spa Treatment Plan', 'healthcare', 'medspa', 'treatment_plan',
 'Your personalized treatment plan from {business_name}',
 '<h2>Hi {customer_name}!</h2><p>Based on your consultation, we''ve created a personalized treatment plan for you:</p><ul><li>{treatment_1}</li><li>{treatment_2}</li><li>{treatment_3}</li></ul><p>Ready to get started? <a href="{booking_link}">Schedule your first treatment</a></p><p>Questions? <a href="{contact_link}">Contact us</a></p><p>Best regards,<br>Dr. {provider_name} and the {business_name} Team</p>',
 TRUE, '["customer_name", "treatment_1", "treatment_2", "treatment_3", "booking_link", "contact_link", "provider_name", "business_name"]'::jsonb),

-- Real Estate Templates
('Real Estate Market Update', 'real_estate', 'realestate', 'market_update',
 'Weekly market update: {area} real estate insights',
 '<h2>Hi {customer_name}!</h2><p>Here''s your weekly {area} real estate market update:</p><ul><li>Average home price: {avg_price}</li><li>Homes sold this week: {homes_sold}</li><li>Days on market: {days_on_market}</li><li>Interest rates: {interest_rates}</li></ul><p>Interested in buying or selling? <a href="{contact_link}">Let''s talk</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>',
 TRUE, '["customer_name", "area", "avg_price", "homes_sold", "days_on_market", "interest_rates", "contact_link", "agent_name", "business_name"]'::jsonb),

('Real Estate Open House', 'real_estate', 'realestate', 'open_house',
 'Open House this weekend: {property_address}',
 '<h2>Hi {customer_name}!</h2><p>Don''t miss this weekend''s open house!</p><p><strong>Property:</strong> {property_address}</p><p><strong>Date:</strong> {open_house_date}</p><p><strong>Time:</strong> {open_house_time}</p><p><strong>Price:</strong> {property_price}</p><p>Interested? <a href="{contact_link}">RSVP here</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>',
 TRUE, '["customer_name", "property_address", "open_house_date", "open_house_time", "property_price", "contact_link", "agent_name", "business_name"]'::jsonb),

-- Home Services Templates
('Home Services Review Request', 'home_services', 'homeservices', 'review_request',
 'How was your {service} experience? Your feedback matters!',
 '<h2>Hi {customer_name}!</h2><p>Thank you for choosing {business_name} for your {service}!</p><p>We hope you''re completely satisfied with our work. Your feedback helps us improve and helps other homeowners make informed decisions.</p><p><a href="{review_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Need follow-up service? <a href="{booking_link}">Schedule here</a></p><p>Thank you for your business!<br>{business_name} Team</p>',
 TRUE, '["customer_name", "business_name", "service", "review_link", "booking_link"]'::jsonb),

('Home Services Maintenance Reminder', 'home_services', 'homeservices', 'maintenance_reminder',
 'Time for your {service} maintenance - {business_name}',
 '<h2>Hi {customer_name}!</h2><p>It''s time for your {service} maintenance!</p><p>Regular maintenance helps ensure your {service} continues to work efficiently and prevents costly repairs.</p><p><a href="{booking_link}" style="background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Schedule Maintenance</a></p><p>Questions? <a href="{contact_link}">Contact us</a></p><p>Best regards,<br>{business_name} Team</p>',
 TRUE, '["customer_name", "service", "business_name", "booking_link", "contact_link"]'::jsonb),

-- Restaurant Templates
('Restaurant Review Request', 'food_service', 'restaurant', 'review_request',
 'How was your dining experience at {business_name}?',
 '<h2>Hi {customer_name}!</h2><p>Thank you for dining with us at {business_name}!</p><p>We hope you enjoyed your meal and the service. Your feedback helps us improve and helps other diners discover our restaurant.</p><p><a href="{review_link}" style="background: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to make another reservation? <a href="{booking_link}">Book here</a></p><p>Thank you for choosing {business_name}!<br>Best regards,<br>{business_name} Team</p>',
 TRUE, '["customer_name", "business_name", "review_link", "booking_link"]'::jsonb),

-- Retail Templates
('Retail Review Request', 'retail', 'retail', 'review_request',
 'How was your shopping experience at {business_name}?',
 '<h2>Hi {customer_name}!</h2><p>Thank you for shopping with us at {business_name}!</p><p>We hope you''re happy with your purchase. Your feedback helps us improve and helps other customers discover our products.</p><p><a href="{review_link}" style="background: #9C27B0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to shop again? <a href="{website_link}">Visit our store</a></p><p>Thank you for your business!<br>{business_name} Team</p>',
 TRUE, '["customer_name", "business_name", "review_link", "website_link"]'::jsonb)
) AS v(template_name, niche, business_type, campaign_type, subject_template, content_template, is_default, variables)
WHERE NOT EXISTS (
    SELECT 1 FROM email_templates WHERE template_name = v.template_name
);

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Email templates table fixed successfully!';
    RAISE NOTICE 'Added missing columns: niche, business_type, is_default, is_active, created_at, updated_at';
    RAISE NOTICE 'Updated existing records with proper template_name values';
    RAISE NOTICE 'Inserted default templates for 6 business types';
    RAISE NOTICE 'Email system is now ready to use!';
END $$;
