-- Run after 0005_brand_kit.sql.
-- 1) Fixes the pipeline_stage constraint to match the real 7-stage spine
--    the OpportunityTracker UI already uses.
-- 2) Adds escrow/milestone/client-share tables the UI already queries.
-- 3) Adds what a real Public Profile needs: username, avatar, bio,
--    location, and a services/pricing table — plus SAFE public read access.

-- ===== 1. Fix pipeline_stage to the real 7-stage spine =====
alter table opportunities drop constraint if exists opportunities_pipeline_stage_check;
alter table opportunities add constraint opportunities_pipeline_stage_check
  check (pipeline_stage in (
    'LEAD_CAPTURED', 'PROPOSAL_SENT', 'CONTRACT_DEPOSIT', 'SHARED_PROJECT_VIEW',
    'MILESTONE_RELEASE', 'FINAL_PAYMENT_CLOSE', 'RETAIN_REFER'
  ));
alter table opportunities alter column pipeline_stage set default 'LEAD_CAPTURED';

-- ===== 2. Escrow, milestones, client share links =====
create table if not exists opportunity_milestones (
  id uuid primary key default uuid_generate_v4(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric not null default 0,
  sequence int not null default 1,
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'DELIVERED', 'APPROVED')),
  deliverable_note text,
  delivered_at timestamptz,
  approved_at timestamptz,
  approved_by text check (approved_by in ('professional', 'client')),
  created_at timestamptz not null default now()
);

create table if not exists escrow_transactions (
  id uuid primary key default uuid_generate_v4(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('DEPOSIT_HELD', 'RELEASED', 'REFUNDED')),
  amount numeric not null default 0,
  note text,
  milestone_id uuid references opportunity_milestones(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists opportunity_share_links (
  id uuid primary key default uuid_generate_v4(),
  opportunity_id uuid not null unique references opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  client_name text,
  client_email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table opportunity_milestones enable row level security;
alter table escrow_transactions enable row level security;
alter table opportunity_share_links enable row level security;

create policy "own opportunity_milestones" on opportunity_milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own escrow_transactions" on escrow_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own opportunity_share_links" on opportunity_share_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table opportunity_documents drop constraint if exists opportunity_documents_status_check;
alter table opportunity_documents add constraint opportunity_documents_status_check
  check (status in ('Paid', 'Pending', 'Signed', 'Held'));

-- ===== 3. Public Profile: username, safe public fields, services =====
alter table brand_foundation
  add column if not exists username text unique,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists niche text,
  add column if not exists primary_goal text,
  add column if not exists bio_variants jsonb;

create table if not exists profile_services (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  price_range text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table profile_services enable row level security;

-- Owners manage their own services...
create policy "own profile_services" on profile_services
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ...but services are also readable by anyone (needed for the public
-- profile page). Note: we deliberately do NOT add a public read policy on
-- brand_foundation or user_social_accounts — those are read through the
-- public-profile edge function instead, using the service role key, so we
-- control exactly which columns are ever exposed (never access tokens).
create policy "public can view services" on profile_services
  for select using (true);
