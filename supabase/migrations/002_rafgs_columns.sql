alter table leads
  add column if not exists rafgs_state text default 'NEW',
  add column if not exists last_outbound_at timestamptz;
