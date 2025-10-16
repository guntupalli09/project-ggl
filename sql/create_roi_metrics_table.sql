-- Create roi_metrics table for tracking weekly revenue and ROI data
-- This fixes the 406 errors when querying roi_metrics

-- Create roi_metrics table
CREATE TABLE IF NOT EXISTS roi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  revenue DECIMAL(10,2) DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0,
  roi DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE roi_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own ROI metrics" ON roi_metrics;
DROP POLICY IF EXISTS "Users can insert their own ROI metrics" ON roi_metrics;
DROP POLICY IF EXISTS "Users can update their own ROI metrics" ON roi_metrics;
DROP POLICY IF EXISTS "Users can delete their own ROI metrics" ON roi_metrics;

CREATE POLICY "Users can view their own ROI metrics" ON roi_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ROI metrics" ON roi_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ROI metrics" ON roi_metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ROI metrics" ON roi_metrics
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roi_metrics_user_id ON roi_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_metrics_week_start_date ON roi_metrics(week_start_date);
CREATE INDEX IF NOT EXISTS idx_roi_metrics_user_week ON roi_metrics(user_id, week_start_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_roi_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_roi_metrics_updated_at ON roi_metrics;
CREATE TRIGGER trigger_update_roi_metrics_updated_at
  BEFORE UPDATE ON roi_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_roi_metrics_updated_at();

-- Grant permissions
GRANT ALL ON roi_metrics TO authenticated;
GRANT ALL ON roi_metrics TO service_role;

