-- Hotfix: add missing columns to workflow_automations to match app queries
-- This resolves errors like: column "user_id", "lead_id", "status", and "scheduled_for" of relation "workflow_automations" does not exist

ALTER TABLE workflow_automations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Optional: indexes for user-scoped and lead-scoped lookups in UI
CREATE INDEX IF NOT EXISTS idx_workflow_automations_user_id ON workflow_automations(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_automations_lead_id ON workflow_automations(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_automations_status ON workflow_automations(status);
CREATE INDEX IF NOT EXISTS idx_workflow_automations_scheduled_for ON workflow_automations(scheduled_for);

-- Note: Existing rows will have user_id = NULL, lead_id = NULL, status = 'active', and other new columns = NULL. 
-- If you later scope workflows per user/lead, backfill these as needed or adjust queries to also support niche_template_id scoping.


