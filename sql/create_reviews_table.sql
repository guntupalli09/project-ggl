-- Create reviews table for tracking Google reviews and referral automation
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    review_id TEXT, -- Google review ID
    reviewer_name TEXT,
    reviewer_email TEXT,
    review_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_url TEXT,
    platform TEXT DEFAULT 'google', -- google, yelp, facebook, etc.
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'escalated', 'resolved')),
    response_text TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    is_positive BOOLEAN GENERATED ALWAYS AS (rating >= 4) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_requests table for tracking referral automation
CREATE TABLE IF NOT EXISTS public.referral_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    service_completed_date TIMESTAMP WITH TIME ZONE,
    service_type TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    referral_request_sent BOOLEAN DEFAULT FALSE,
    referral_request_date TIMESTAMP WITH TIME ZONE,
    referral_response_received BOOLEAN DEFAULT FALSE,
    referral_response_date TIMESTAMP WITH TIME ZONE,
    referral_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reviews
CREATE POLICY "Users can view their own reviews" ON public.reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for referral_requests
CREATE POLICY "Users can view their own referral requests" ON public.referral_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral requests" ON public.referral_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral requests" ON public.referral_requests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own referral requests" ON public.referral_requests
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_lead_id ON public.reviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);

CREATE INDEX IF NOT EXISTS idx_referral_requests_user_id ON public.referral_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_lead_id ON public.referral_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_booking_id ON public.referral_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_service_date ON public.referral_requests(service_completed_date);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_referral_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_reviews_updated_at ON public.reviews;
CREATE TRIGGER trigger_update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

DROP TRIGGER IF EXISTS trigger_update_referral_requests_updated_at ON public.referral_requests;
CREATE TRIGGER trigger_update_referral_requests_updated_at
    BEFORE UPDATE ON public.referral_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_requests_updated_at();

-- Grant permissions
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.referral_requests TO authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.referral_requests TO service_role;
