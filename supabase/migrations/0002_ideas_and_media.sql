-- Run this in Supabase SQL Editor after 0001_init.sql.

create table if not exists ideas (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table ideas enable row level security;

create policy "own ideas" on ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for the Media Library. Public read (so images render
-- directly via public URL) but writes are restricted to each user's own
-- folder (named after their user_id) via the policies below.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media: users manage their own folder"
on storage.objects for all
using (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "media: public read"
on storage.objects for select
using (bucket_id = 'media');
