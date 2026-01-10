-- Simple Email System for GetGetLeads
-- Focused on core functionality: metrics, management, and basic workflow

-- ========================================
-- EMAIL LOGS TABLE (for tracking all emails)
-- ========================================

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    campaign_type VARCHAR(100) NOT NULL, -- 'review_request', 'promotion', 'offer', 'update', 'custom'
    status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- EMAIL WORKFLOWS TABLE (simple automation)
-- ========================================

CREATE TABLE IF NOT EXISTS email_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(100) NOT NULL, -- 'review_request' only for automation
    is_active BOOLEAN DEFAULT TRUE,
    delay_hours INTEGER DEFAULT 24, -- hours after lead completion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- EMAIL CAMPAIGNS TABLE (for manual campaigns)
-- ========================================

CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(100) NOT NULL, -- 'promotion', 'offer', 'update', 'custom'
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    lead_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'paused'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_type ON email_logs(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

CREATE INDEX IF NOT EXISTS idx_email_workflows_user_id ON email_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_email_workflows_campaign_type ON email_workflows(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_workflows_is_active ON email_workflows(is_active);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- ========================================
-- RLS POLICIES
-- ========================================

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Email logs policies
CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email logs" ON email_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email logs" ON email_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Email workflows policies
CREATE POLICY "Users can view their own email workflows" ON email_workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email workflows" ON email_workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email workflows" ON email_workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email workflows" ON email_workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Email campaigns policies
CREATE POLICY "Users can view their own email campaigns" ON email_campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email campaigns" ON email_campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email campaigns" ON email_campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email campaigns" ON email_campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- INSERT DEFAULT WORKFLOW
-- ========================================

-- Insert default review request workflow for existing users
INSERT INTO email_workflows (user_id, name, campaign_type, is_active, delay_hours)
SELECT 
    id as user_id,
    'Automatic Review Requests',
    'review_request',
    TRUE,
    24
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM email_workflows 
    WHERE user_id = auth.users.id AND campaign_type = 'review_request'
);

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Simple email system created successfully!';
    RAISE NOTICE 'Tables created: email_logs, email_workflows, email_campaigns';
    RAISE NOTICE 'Default review request workflow added for all users';
    RAISE NOTICE 'Email system is ready to use!';
END $$;
