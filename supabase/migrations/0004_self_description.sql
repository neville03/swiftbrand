-- Run this in Supabase SQL Editor after 0003_direct_linkedin_oauth.sql.
-- Adds a free-text field where the person describes themselves — how they
-- think, how they want to come across — as extra grounding context for the
-- AI Ghostwriter, on top of the structured brand-voice fields.

alter table brand_foundation
  add column if not exists self_description text;
