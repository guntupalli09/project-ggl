-- Insert sample revenue data for testing
-- This will fix the empty revenue display issue

-- Insert sample revenue data for the current user
INSERT INTO roi_metrics (user_id, week_start_date, revenue, leads_count, bookings_count, conversion_rate, cost, roi)
VALUES (
  'be84619d-f7ec-4dc1-ac91-ee62236e7549', -- Current user ID
  '2025-10-13', -- Current week start date
  7.00, -- Sample revenue
  5, -- Sample leads count
  2, -- Sample bookings count
  40.0, -- Sample conversion rate
  0.00, -- Sample cost
  0.0 -- Sample ROI
) ON CONFLICT (user_id, week_start_date) 
DO UPDATE SET 
  revenue = EXCLUDED.revenue,
  leads_count = EXCLUDED.leads_count,
  bookings_count = EXCLUDED.bookings_count,
  conversion_rate = EXCLUDED.conversion_rate,
  cost = EXCLUDED.cost,
  roi = EXCLUDED.roi,
  updated_at = NOW();
