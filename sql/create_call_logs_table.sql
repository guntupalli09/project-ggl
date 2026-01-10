-- Create call_logs table for Google Business Profile call tracking
CREATE TABLE IF NOT EXISTS public.call_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    phone text NOT NULL,
    caller_name text,
    call_type text NOT NULL DEFAULT 'missed' CHECK (call_type IN ('missed', 'answered', 'ai_followup_sent')),
    call_time timestamptz NOT NULL DEFAULT now(),
    duration_seconds integer,
    ai_followup_sent boolean DEFAULT false,
    google_call_id text, -- Google's internal call ID
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_time ON public.call_logs(call_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_type ON public.call_logs(call_type);
CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON public.call_logs(phone);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON public.call_logs(lead_id);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own call logs" ON public.call_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call logs" ON public.call_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call logs" ON public.call_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call logs" ON public.call_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_call_logs_updated_at
    BEFORE UPDATE ON public.call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_call_logs_updated_at();

-- Add comment
COMMENT ON TABLE public.call_logs IS 'Tracks call logs from Google Business Profile including missed calls and AI follow-ups';
COMMENT ON COLUMN public.call_logs.call_type IS 'Type of call: missed, answered, or ai_followup_sent';
COMMENT ON COLUMN public.call_logs.ai_followup_sent IS 'Whether an AI follow-up message was sent for this call';
COMMENT ON COLUMN public.call_logs.google_call_id IS 'Google Business Profile internal call identifier';
