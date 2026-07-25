-- Postwise initial schema
-- Run this in your own Supabase project: Dashboard -> SQL Editor -> paste & run
-- (or via `supabase db push` if you use the Supabase CLI locally).

create extension if not exists "uuid-ossp";

-- One row per user: what they told us during onboarding.
create table if not exists brand_foundation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text,
  industry text,
  target_audience text,
  brand_voice text,
  key_topics text[],
  updated_at timestamptz default now()
);

-- One row per user: their Ayrshare sub-profile + LinkedIn connection state.
create table if not exists linkedin_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ayrshare_profile_key text,
  linkedin_connected boolean not null default false,
  name text,
  picture text,
  connected_at timestamptz
);

create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text not null,
  flyer_path text,
  status text not null default 'draft' check (status in ('draft', 'publishing', 'published', 'failed')),
  ayrshare_post_id text,
  linkedin_url text,
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists post_metrics (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  likes int not null default 0,
  comments int not null default 0,
  impressions int not null default 0,
  shares int not null default 0,
  fetched_at timestamptz not null default now()
);

-- Row Level Security: every user can only ever see/touch their own rows.
alter table brand_foundation enable row level security;
alter table linkedin_profile enable row level security;
alter table posts enable row level security;
alter table post_metrics enable row level security;

create policy "own brand_foundation" on brand_foundation
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own linkedin_profile" on linkedin_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own posts" on posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own post_metrics" on post_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
