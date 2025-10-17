-- Add missing business columns to user_settings table
-- Run this in Supabase SQL Editor

-- Add business_name and website columns if they don't exist
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS business_slug TEXT;

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;

-- Recreate policies with comprehensive access
CREATE POLICY "Users can view own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT SELECT ON public.user_settings TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Business columns added to user_settings table successfully!';
    RAISE NOTICE 'Added columns: business_name, website, business_slug';
    RAISE NOTICE 'RLS policies updated for proper access';
END $$;
