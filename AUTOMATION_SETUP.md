# 🚀 Automation System Setup Guide

## Quick Setup for Development Testing

### Step 1: Database Setup
1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Run the SQL from `create_automations_table.sql`:

```sql
-- Create automations table
create table if not exists automations(
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  delay_minutes int,
  active boolean default true,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table automations enable row level security;

-- Create RLS policies for automations
create policy "Users can view their own automations" on automations
  for select using (auth.uid() = user_id);

create policy "Users can insert their own automations" on automations
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own automations" on automations
  for update using (auth.uid() = user_id);

create policy "Users can delete their own automations" on automations
  for delete using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists idx_automations_user_id on automations(user_id);
create index if not exists idx_automations_active on automations(active);
```

### Step 2: Add Test Data
1. **Start your dev server**: `npm run dev`
2. **Go to `/leads`** and add some test leads:
   - Name: "John Doe"
   - Email: "john@example.com"
   - Status: "new"
   - Notes: "Interested in our services"
3. **Add 2-3 more leads** with different names and emails

### Step 3: Test the System
1. **Go to `/automations`** in your app
2. **Click "Test Automations"** button
3. **Check the results** - you should see:
   - Number of messages sent
   - Which leads were processed
   - Generated AI messages (preview)

## 🔧 Troubleshooting

### If you get "Test Failed" errors:

1. **Check browser console** for detailed error messages
2. **Verify Supabase connection** - make sure your `.env` file has:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. **Check if you have leads** - the system needs at least one lead to test
4. **Verify Ollama is running** - the system will use a fallback message if Ollama is not available

### Common Issues:

- **"No leads found"** → Add some leads in the Leads page first
- **"Ollama error"** → The system will use a fallback message, this is normal
- **"API endpoint not found"** → Make sure you're running `npm run dev` and the server is running

## 🎯 What the Test Does

1. **Finds all leads** with status "new" or "contacted"
2. **Creates a test automation** (5-minute delay for testing)
3. **Generates AI follow-up messages** using Ollama (or fallback)
4. **Simulates email sending** (safe for development)
5. **Updates lead status** to "contacted"
6. **Creates message records** in the database
7. **Shows detailed results** with generated messages

## 🚀 Production Deployment

For production, you'll need to:
1. **Set environment variables** in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
   - `INTERNAL_API_KEY`
2. **Deploy to Vercel** - cron jobs will run automatically
3. **Set up real email service** (SendGrid, Mailgun, etc.)

The automation system is **fully functional** - it's just running in test mode for development safety! 🎉

