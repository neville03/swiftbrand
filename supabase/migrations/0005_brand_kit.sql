-- Run this in Supabase SQL Editor after 0004_self_description.sql.
-- Brand Kit: colors + fonts (one row per user), plus logo/video assets
-- (many rows per user, stored as files in the existing "media" bucket
-- under `${user_id}/brand-kit/...`).

create table if not exists brand_kit (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_color text not null default '#7C3AED',
  accent_color text not null default '#2563EB',
  success_color text not null default '#22C55E',
  bg_color text not null default '#F8FAFC',
  heading_font text not null default 'Plus Jakarta Sans',
  body_font text not null default 'Inter',
  updated_at timestamptz not null default now()
);

create table if not exists brand_kit_assets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('logo', 'video')),
  name text not null,
  path text not null,
  tag text,
  created_at timestamptz not null default now()
);

alter table brand_kit enable row level security;
alter table brand_kit_assets enable row level security;

create policy "own brand_kit" on brand_kit
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own brand_kit_assets" on brand_kit_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);