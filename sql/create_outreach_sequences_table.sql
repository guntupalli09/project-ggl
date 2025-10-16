-- Create the outreach_sequences table
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  product_description TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  tone TEXT NOT NULL,
  initial_message TEXT NOT NULL,
  follow_up_message TEXT NOT NULL,
  reminder_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to manage only their own sequences
CREATE POLICY "Users can manage their own outreach sequences" ON outreach_sequences
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_user_id ON outreach_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_created_at ON outreach_sequences(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_outreach_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_outreach_sequences_updated_at 
    BEFORE UPDATE ON outreach_sequences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_outreach_sequences_updated_at();
