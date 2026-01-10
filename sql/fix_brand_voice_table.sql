-- Fix brand_voice table and RLS policies
-- This addresses the 406 Not Acceptable error when querying brand_voice

-- Create brand_voice table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.brand_voice (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_tone TEXT NOT NULL,
    sample_copy TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.brand_voice ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own brand voice" ON public.brand_voice;
DROP POLICY IF EXISTS "Users can insert their own brand voice" ON public.brand_voice;
DROP POLICY IF EXISTS "Users can update their own brand voice" ON public.brand_voice;
DROP POLICY IF EXISTS "Users can delete their own brand voice" ON public.brand_voice;

-- Create RLS policies
CREATE POLICY "Users can view their own brand voice" ON public.brand_voice
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand voice" ON public.brand_voice
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand voice" ON public.brand_voice
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand voice" ON public.brand_voice
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brand_voice_user_id ON public.brand_voice(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_voice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_brand_voice_updated_at ON public.brand_voice;
CREATE TRIGGER trigger_update_brand_voice_updated_at
    BEFORE UPDATE ON public.brand_voice
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_voice_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.brand_voice TO authenticated;
GRANT ALL ON public.brand_voice TO service_role;
