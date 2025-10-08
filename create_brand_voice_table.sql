-- Create the brand_voice table
CREATE TABLE IF NOT EXISTS brand_voice (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_tone TEXT NOT NULL,
  sample_copy TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE brand_voice ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to manage only their own brand voice
CREATE POLICY "Users can manage their own brand voice" ON brand_voice
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brand_voice_user_id ON brand_voice(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_voice_created_at ON brand_voice(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_voice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_brand_voice_updated_at 
    BEFORE UPDATE ON brand_voice 
    FOR EACH ROW 
    EXECUTE FUNCTION update_brand_voice_updated_at();

-- Create a unique constraint to ensure one brand voice per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_voice_user_unique 
ON brand_voice(user_id);
