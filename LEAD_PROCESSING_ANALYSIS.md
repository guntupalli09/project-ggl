# Lead Processing Flow Analysis

## Current Lead Sources Identified

1. **HostedForm** - Public lead capture form (`/leads/[businessSlug]`)
2. **MissedCall** - Twilio webhook for missed calls
3. **Manual** - Manual entry via Leads page
4. **GoogleMsg** - (Referenced but not implemented)

## Critical Issues Found

### 1. Database Schema Inconsistencies

**Problem**: The `leads` table is missing critical fields that are being used in the code:
- `last_outbound_message` (used in speedToLead, followups, smartAutomation)
- `last_inbound_message` (used in followups, smartAutomation)
- `status` field exists but may not be properly updated

**Impact**: 
- Speed-to-lead automation fails when trying to update `last_outbound_message`
- Follow-up automation can't track message history
- Lead status updates may fail

### 2. Speed-to-Lead API Issues

**Problem**: The speedToLead API has several issues:
- Uses `lead_id` and `business_slug` parameters but should use `leadId` and `userId` for consistency
- Doesn't update lead status to 'contacted' after sending message
- Missing error handling for database updates
- Inconsistent parameter naming across different APIs

### 3. Race Condition Risks

**Problem**: Multiple lead sources could create race conditions:
- HostedForm and MissedCall both create leads and trigger speedToLead
- No atomic transactions for lead creation + automation trigger
- Concurrent speedToLead calls could duplicate messages

### 4. Inconsistent Lead Status Updates

**Problem**: Different lead sources handle status updates differently:
- HostedForm: Creates lead with status 'new', doesn't update to 'contacted'
- MissedCall: Creates lead with status 'new', doesn't update to 'contacted'  
- SpeedToLead: Updates `last_outbound_message` but not status
- Followups: Updates status to 'contacted' but only for 'new' leads

### 5. Missing Database Fields

**Problem**: The leads table schema is incomplete:
```sql
-- Current schema (incomplete)
CREATE TABLE leads (
  id uuid primary key,
  user_id uuid references auth.users(id),
  name text,
  email text,
  phone text,
  source text,
  status text default 'new',
  notes text,
  created_at timestamptz default now()
);

-- Missing fields:
-- last_outbound_message timestamptz
-- last_inbound_message timestamptz
-- updated_at timestamptz
```

## Recommended Fixes

### 1. Update Leads Table Schema
Add missing fields to leads table:
- `last_outbound_message timestamptz`
- `last_inbound_message timestamptz` 
- `updated_at timestamptz`

### 2. Standardize Speed-to-Lead API
- Use consistent parameter names (`leadId`, `userId`)
- Update lead status to 'contacted' after successful message
- Add proper error handling
- Use atomic transactions

### 3. Implement Atomic Lead Processing
- Create lead and trigger automation in single transaction
- Add retry logic for failed automations
- Implement idempotency for duplicate calls

### 4. Standardize Lead Status Flow
All lead sources should follow this flow:
1. Create lead with status 'new'
2. Trigger speedToLead automation
3. Update status to 'contacted' after successful message
4. Update `last_outbound_message` timestamp

### 5. Add Lead Source Validation
- Validate lead source values
- Add source-specific handling logic
- Implement source-specific message templates
