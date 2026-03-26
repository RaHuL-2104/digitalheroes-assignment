-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('visitor', 'subscriber', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active', 'inactive', 'canceled', 'lapsed', 'pending');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type subscription_plan as enum ('monthly', 'yearly');
  end if;
  if not exists (select 1 from pg_type where typname = 'draw_mode') then
    create type draw_mode as enum ('random', 'algorithmic_most_frequent', 'algorithmic_least_frequent');
  end if;
  if not exists (select 1 from pg_type where typname = 'draw_tier') then
    create type draw_tier as enum ('match_5', 'match_4', 'match_3');
  end if;
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type verification_status as enum ('pending_verification', 'approved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'payout_status') then
    create type payout_status as enum ('pending', 'paid');
  end if;
end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role user_role not null default 'subscriber',
  country_code text not null default 'IN',
  currency_code text not null default 'INR',
  team_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan subscription_plan not null,
  status subscription_status not null default 'pending',
  renewal_date timestamptz,
  canceled_at timestamptz,
  campaign_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 45),
  played_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scores_user_played on public.scores(user_id, played_at desc, created_at desc);

create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  image_url text,
  upcoming_events text,
  is_featured boolean not null default false,
  country_code text not null default 'IN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_charity_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  charity_id uuid references public.charities(id) on delete set null,
  contribution_percent numeric(5,2) not null check (contribution_percent >= 10 and contribution_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_month text not null unique,
  mode draw_mode not null,
  numbers integer[] not null,
  status text not null default 'simulated',
  winners_summary jsonb not null default '{"match_5":0,"match_4":0,"match_3":0}'::jsonb,
  rollover_amount numeric(12,2) not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  draw_month text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  numbers integer[] not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_draw_entries_month on public.draw_entries(draw_month);

create table if not exists public.draw_numbers (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  number integer not null check (number >= 1 and number <= 45),
  created_at timestamptz not null default now()
);

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier draw_tier not null,
  amount numeric(12,2) not null default 0,
  verification_status verification_status not null default 'pending_verification',
  payout_status payout_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.winner_verifications (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null references public.winners(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  proof_url text not null,
  status verification_status not null default 'pending_verification',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null unique references public.winners(id) on delete cascade,
  status payout_status not null default 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prize_pool_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  subscription_amount numeric(12,2) not null,
  charity_amount numeric(12,2) not null,
  prize_pool_amount numeric(12,2) not null,
  retained_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'email',
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Rolling 5 score insert helper
create or replace function public.insert_user_score(
  p_user_id uuid,
  p_score integer,
  p_played_at timestamptz
) returns void
language plpgsql
security definer
as $$
begin
  if p_score < 1 or p_score > 45 then
    raise exception 'Score must be between 1 and 45';
  end if;

  insert into public.scores(user_id, score, played_at)
  values (p_user_id, p_score, p_played_at);

  delete from public.scores
  where id in (
    select id
    from public.scores
    where user_id = p_user_id
    order by played_at desc, created_at desc
    offset 5
  );
end;
$$;

-- Auto profile on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'subscriber'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.scores enable row level security;
alter table public.charities enable row level security;
alter table public.user_charity_settings enable row level security;
alter table public.draws enable row level security;
alter table public.draw_entries enable row level security;
alter table public.winners enable row level security;
alter table public.winner_verifications enable row level security;
alter table public.payouts enable row level security;
alter table public.prize_pool_ledger enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can read own profile" on public.profiles
for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
for update using (auth.uid() = id);

create policy "Users can read own subscriptions" on public.subscriptions
for select using (auth.uid() = user_id);

create policy "Users can read own scores" on public.scores
for select using (auth.uid() = user_id);

create policy "Users can insert own scores" on public.scores
for insert with check (auth.uid() = user_id);

create policy "Users can read public charities" on public.charities
for select using (true);

create policy "Users can read own charity settings" on public.user_charity_settings
for select using (auth.uid() = user_id);

create policy "Users can upsert own charity settings" on public.user_charity_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read published draws" on public.draws
for select using (status = 'published' or auth.role() = 'service_role');

create policy "Users can manage own draw entries" on public.draw_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read own winners" on public.winners
for select using (auth.uid() = user_id);

create policy "Users can create own verification uploads" on public.winner_verifications
for insert with check (auth.uid() = user_id);

create policy "Users can read own verification uploads" on public.winner_verifications
for select using (auth.uid() = user_id);

create policy "Users can read own notifications" on public.notifications
for select using (auth.uid() = user_id);

-- Storage bucket (run once in SQL editor)
insert into storage.buckets (id, name, public)
values ('winner-proofs', 'winner-proofs', true)
on conflict (id) do nothing;
