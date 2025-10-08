-- Create the roi_metrics table
CREATE TABLE IF NOT EXISTS roi_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE roi_metrics ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to manage only their own ROI metrics
CREATE POLICY "Users can manage their own ROI metrics" ON roi_metrics
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roi_metrics_user_id ON roi_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_metrics_week_start ON roi_metrics(week_start_date);
CREATE INDEX IF NOT EXISTS idx_roi_metrics_created_at ON roi_metrics(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_roi_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_roi_metrics_updated_at 
    BEFORE UPDATE ON roi_metrics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_roi_metrics_updated_at();

-- Create a unique constraint to prevent duplicate entries for the same week
CREATE UNIQUE INDEX IF NOT EXISTS idx_roi_metrics_user_week 
ON roi_metrics(user_id, week_start_date);
