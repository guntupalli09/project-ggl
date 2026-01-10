-- Simple call_logs table for testing
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    caller_name TEXT,
    call_type TEXT NOT NULL DEFAULT 'missed' CHECK (call_type IN ('missed', 'answered', 'ai_followup_sent')),
    call_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds INTEGER,
    ai_followup_sent BOOLEAN DEFAULT false,
    google_call_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_time ON call_logs(call_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_type ON call_logs(call_type);

-- Enable RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own call logs" ON call_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call logs" ON call_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call logs" ON call_logs
    FOR UPDATE USING (auth.uid() = user_id);

