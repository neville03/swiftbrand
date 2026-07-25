-- Replaces the Ayrshare-based linkedin_profile approach with direct,
-- per-user LinkedIn OAuth tokens. Run this after 0001 and 0002.

create table if not exists user_social_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'linkedin',
  platform_user_id text,
  platform_user_name text,
  platform_user_picture text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, platform)
);

alter table user_social_accounts enable row level security;

create policy "own social accounts" on user_social_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The old Ayrshare-based table is no longer used by the app. Safe to drop
-- once you've confirmed nothing else references it.
-- drop table if exists linkedin_profile;
