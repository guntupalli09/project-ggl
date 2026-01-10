-- Create leads table
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  source text,
  status text default 'new', -- new|contacted|booked|completed
  notes text,
  created_at timestamptz default now()
);

-- Create messages table
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  channel text, -- email|sms
  direction text, -- out|in
  body text,
  sent_at timestamptz
);

-- Create user_settings table
create table if not exists user_settings (
  user_id uuid primary key,
  booking_link text,
  niche text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table leads enable row level security;
alter table messages enable row level security;
alter table user_settings enable row level security;

-- Create RLS policies for leads
create policy "Users can view their own leads" on leads
  for select using (auth.uid() = user_id);

create policy "Users can insert their own leads" on leads
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own leads" on leads
  for update using (auth.uid() = user_id);

create policy "Users can delete their own leads" on leads
  for delete using (auth.uid() = user_id);

-- Create RLS policies for messages
create policy "Users can view their own messages" on messages
  for select using (auth.uid() = user_id);

create policy "Users can insert their own messages" on messages
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own messages" on messages
  for update using (auth.uid() = user_id);

create policy "Users can delete their own messages" on messages
  for delete using (auth.uid() = user_id);

-- Create RLS policies for user_settings
create policy "Users can view their own settings" on user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert their own settings" on user_settings
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own settings" on user_settings
  for update using (auth.uid() = user_id);

create policy "Users can delete their own settings" on user_settings
  for delete using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists idx_leads_user_id on leads(user_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_messages_user_id on messages(user_id);
create index if not exists idx_messages_lead_id on messages(lead_id);
create index if not exists idx_user_settings_user_id on user_settings(user_id);
