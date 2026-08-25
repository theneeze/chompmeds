-- ChompMeds schema
create extension if not exists "uuid-ossp";

create table if not exists settings (
  id int primary key default 1,
  timezone text not null default 'Europe/Rome',
  constraint settings_singleton check (id = 1)
);
insert into settings (id, timezone) values (1, 'Europe/Rome')
  on conflict (id) do nothing;

create table if not exists medicines (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  dose text default '',
  emoji text default '💊',
  kind text not null default 'medicine' check (kind in ('medicine', 'vitamin')),
  time text not null,                              -- 'HH:MM' 24hr, local to settings.timezone
  days_of_week int[] not null default '{0,1,2,3,4,5,6}', -- 0 = Sunday ... 6 = Saturday
  sound text not null default 'siren',
  nag_interval_minutes int not null default 15,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists logs (
  id uuid primary key default uuid_generate_v4(),
  medicine_id uuid not null references medicines(id) on delete cascade,
  log_date date not null,
  scheduled_time text not null,
  status text not null default 'pending' check (status in ('pending', 'reminded', 'nagging', 'taken')),
  taken_at timestamptz,
  reminder_count int not null default 0,
  last_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (medicine_id, log_date)
);

create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Row level security: this is a single-user personal app, so the anon key
-- is allowed full access. Do not reuse this schema/policy pattern for a
-- multi-user app without adding real auth.
alter table medicines enable row level security;
alter table logs enable row level security;
alter table push_subscriptions enable row level security;
alter table settings enable row level security;

drop policy if exists "allow all medicines" on medicines;
create policy "allow all medicines" on medicines for all using (true) with check (true);

drop policy if exists "allow all logs" on logs;
create policy "allow all logs" on logs for all using (true) with check (true);

drop policy if exists "allow all push_subscriptions" on push_subscriptions;
create policy "allow all push_subscriptions" on push_subscriptions for all using (true) with check (true);

drop policy if exists "allow all settings" on settings;
create policy "allow all settings" on settings for all using (true) with check (true);
