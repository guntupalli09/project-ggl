-- Booking System Tables
-- This file contains the SQL to create all necessary tables for the booking system

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    service TEXT NOT NULL,
    booking_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    calendar_event_id TEXT, -- Google Calendar event ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calendar_automations table
CREATE TABLE IF NOT EXISTS calendar_automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'calendar' CHECK (type IN ('calendar', 'booking', 'reminder')),
    trigger_event TEXT NOT NULL, -- 'lead_created', 'booking_created', 'follow_up_due', etc.
    action_type TEXT NOT NULL, -- 'create_event', 'send_reminder', 'schedule_meeting'
    event_template JSONB, -- Template for creating events
    delay_minutes INTEGER DEFAULT 0, -- Delay before triggering
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calendar_events table for tracking created events
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'meeting', 'reminder', 'booking', 'follow_up'
    related_id UUID, -- ID of related lead, booking, etc.
    related_type TEXT, -- 'lead', 'booking', 'automation'
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees JSONB, -- Array of attendee objects
    location TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_time ON bookings(booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);

CREATE INDEX IF NOT EXISTS idx_calendar_automations_user_id ON calendar_automations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_automations_active ON calendar_automations(active);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_related ON calendar_events(related_id, related_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_automations_updated_at BEFORE UPDATE ON calendar_automations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" ON bookings
    FOR DELETE USING (auth.uid() = user_id);

-- Calendar automations policies
CREATE POLICY "Users can view own automations" ON calendar_automations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own automations" ON calendar_automations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own automations" ON calendar_automations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own automations" ON calendar_automations
    FOR DELETE USING (auth.uid() = user_id);

-- Calendar events policies
CREATE POLICY "Users can view own events" ON calendar_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON calendar_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON calendar_automations TO authenticated;
GRANT ALL ON calendar_events TO authenticated;

-- Insert some sample calendar automations
INSERT INTO calendar_automations (user_id, name, description, type, trigger_event, action_type, event_template, delay_minutes, active)
SELECT 
    auth.uid(),
    'New Lead Meeting',
    'Automatically schedule a meeting when a new lead is created',
    'calendar',
    'lead_created',
    'create_event',
    '{"summary": "Meeting with {{lead_name}}", "description": "Meeting with {{lead_name}} from {{lead_company}}", "duration_minutes": 60}',
    0,
    true
WHERE auth.uid() IS NOT NULL;

INSERT INTO calendar_automations (user_id, name, description, type, trigger_event, action_type, event_template, delay_minutes, active)
SELECT 
    auth.uid(),
    'Follow-up Reminder',
    'Schedule a follow-up reminder 1 week after initial contact',
    'calendar',
    'lead_contacted',
    'create_event',
    '{"summary": "Follow up with {{lead_name}}", "description": "Follow up with {{lead_name}} from {{lead_company}}", "duration_minutes": 30}',
    10080, -- 1 week in minutes
    true
WHERE auth.uid() IS NOT NULL;

INSERT INTO calendar_automations (user_id, name, description, type, trigger_event, action_type, event_template, delay_minutes, active)
SELECT 
    auth.uid(),
    'Booking Confirmation',
    'Create calendar event when a booking is confirmed',
    'calendar',
    'booking_confirmed',
    'create_event',
    '{"summary": "{{service}} - {{customer_name}}", "description": "Booking with {{customer_name}} for {{service}}", "duration_minutes": "{{duration_minutes}}"}',
    0,
    true
WHERE auth.uid() IS NOT NULL;
