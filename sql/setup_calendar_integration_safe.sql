-- Safe Calendar Integration Setup
-- This version safely handles existing policies and columns

-- Step 1: Add only the essential columns to automations table (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'type') THEN
        ALTER TABLE automations ADD COLUMN type TEXT DEFAULT 'followup';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'trigger_event') THEN
        ALTER TABLE automations ADD COLUMN trigger_event TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'action_type') THEN
        ALTER TABLE automations ADD COLUMN action_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'event_template') THEN
        ALTER TABLE automations ADD COLUMN event_template JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'delay_minutes') THEN
        ALTER TABLE automations ADD COLUMN delay_minutes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 2: Create bookings table (if it doesn't exist)
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

-- Step 3: Create calendar_events table (if it doesn't exist)
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

-- Step 4: Create indexes for better performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_user_id') THEN
        CREATE INDEX idx_bookings_user_id ON bookings(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_booking_time') THEN
        CREATE INDEX idx_bookings_booking_time ON bookings(booking_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_status') THEN
        CREATE INDEX idx_bookings_status ON bookings(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_customer_email') THEN
        CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calendar_events_user_id') THEN
        CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calendar_events_google_event_id') THEN
        CREATE INDEX idx_calendar_events_google_event_id ON calendar_events(google_event_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calendar_events_start_time') THEN
        CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_calendar_events_related') THEN
        CREATE INDEX idx_calendar_events_related ON calendar_events(related_id, related_type);
    END IF;
END $$;

-- Step 5: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 6: Create triggers (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at') THEN
        CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_calendar_events_updated_at') THEN
        CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Step 7: Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for bookings (only if they don't exist)
DO $$
BEGIN
    -- Bookings policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can view own bookings') THEN
        CREATE POLICY "Users can view own bookings" ON bookings
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can insert own bookings') THEN
        CREATE POLICY "Users can insert own bookings" ON bookings
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can update own bookings') THEN
        CREATE POLICY "Users can update own bookings" ON bookings
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Users can delete own bookings') THEN
        CREATE POLICY "Users can delete own bookings" ON bookings
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 9: Create RLS policies for calendar_events (only if they don't exist)
DO $$
BEGIN
    -- Calendar events policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendar_events' AND policyname = 'Users can view own events') THEN
        CREATE POLICY "Users can view own events" ON calendar_events
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendar_events' AND policyname = 'Users can insert own events') THEN
        CREATE POLICY "Users can insert own events" ON calendar_events
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendar_events' AND policyname = 'Users can update own events') THEN
        CREATE POLICY "Users can update own events" ON calendar_events
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendar_events' AND policyname = 'Users can delete own events') THEN
        CREATE POLICY "Users can delete own events" ON calendar_events
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 10: Grant permissions
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON calendar_events TO authenticated;

-- Step 11: Insert sample calendar automations (using only existing columns)
-- Only insert if they don't already exist
INSERT INTO automations (user_id, name, type, trigger_event, action_type, event_template, delay_minutes, active)
SELECT 
    auth.uid(),
    'New Lead Meeting',
    'calendar',
    'lead_created',
    'create_event',
    '{"summary": "Meeting with {{lead_name}}", "description": "Meeting with {{lead_name}} from {{lead_company}}", "duration_minutes": 60}',
    0,
    true
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM automations 
    WHERE user_id = auth.uid() 
    AND name = 'New Lead Meeting'
  );

INSERT INTO automations (user_id, name, type, trigger_event, action_type, event_template, delay_minutes, active)
SELECT 
    auth.uid(),
    'Follow-up Reminder',
    'calendar',
    'lead_contacted',
    'create_event',
    '{"summary": "Follow up with {{lead_name}}", "description": "Follow up with {{lead_name}} from {{lead_company}}", "duration_minutes": 30}',
    10080, -- 1 week in minutes
    true
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM automations 
    WHERE user_id = auth.uid() 
    AND name = 'Follow-up Reminder'
  );

INSERT INTO automations (user_id, name, type, trigger_event, action_type, event_template, delay_minutes, active)
SELECT 
    auth.uid(),
    'Booking Confirmation',
    'calendar',
    'booking_confirmed',
    'create_event',
    '{"summary": "{{service}} - {{customer_name}}", "description": "Booking with {{customer_name}} for {{service}}", "duration_minutes": "{{duration_minutes}}"}',
    0,
    true
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM automations 
    WHERE user_id = auth.uid() 
    AND name = 'Booking Confirmation'
  );

-- Success message
SELECT 'Calendar integration setup completed successfully! All existing data preserved.' as message;
