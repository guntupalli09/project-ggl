-- Create the leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to perform all operations on their own data
-- For now, we'll allow all authenticated users to access all leads
-- You can modify this policy based on your specific requirements
CREATE POLICY "Allow authenticated users to manage leads" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

-- Optional: Create an index on email for better performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Optional: Create an index on created_at for better sorting performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
