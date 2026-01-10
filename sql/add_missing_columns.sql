-- Add missing columns for complete Great Clips scenario functionality
-- This ensures no compromises in the review and referral system

-- 1. Add completed_at column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Add booking_id column to feedback_requests table
ALTER TABLE feedback_requests 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;

-- 3. Ensure message_content column exists in feedback_requests
ALTER TABLE feedback_requests 
ADD COLUMN IF NOT EXISTS message_content TEXT;

-- 4. Add notes column to referral_requests table for storing referral codes and links
ALTER TABLE referral_requests 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Add service_completed_date column to referral_requests if it doesn't exist
ALTER TABLE referral_requests 
ADD COLUMN IF NOT EXISTS service_completed_date TIMESTAMP WITH TIME ZONE;

-- 6. Add referral_request_sent and related columns to referral_requests
ALTER TABLE referral_requests 
ADD COLUMN IF NOT EXISTS referral_request_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_request_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referral_response_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referral_response_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- 7. Add satisfaction_rating column to referral_requests
ALTER TABLE referral_requests 
ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);

-- 8. Add service_type column to referral_requests
ALTER TABLE referral_requests 
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- 9. Add customer_phone column to referral_requests
ALTER TABLE referral_requests 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at ON bookings(completed_at);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_booking_id ON feedback_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_service_date ON referral_requests(service_completed_date);
CREATE INDEX IF NOT EXISTS idx_referral_requests_referral_count ON referral_requests(referral_count);

-- 11. Add comments for documentation
COMMENT ON COLUMN bookings.completed_at IS 'Timestamp when the service was completed';
COMMENT ON COLUMN feedback_requests.booking_id IS 'Reference to the booking that triggered this feedback request';
COMMENT ON COLUMN feedback_requests.message_content IS 'Content of the message to be sent';
COMMENT ON COLUMN referral_requests.notes IS 'JSON data containing referral codes, links, and reward amounts';
COMMENT ON COLUMN referral_requests.service_completed_date IS 'Date when the service was completed';
COMMENT ON COLUMN referral_requests.referral_request_sent IS 'Whether the referral request has been sent';
COMMENT ON COLUMN referral_requests.referral_count IS 'Number of successful referrals from this request';

