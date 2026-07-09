-- Portable Postgres bootstrap (preset: portable-pg)
-- For Supabase, prefer dashboard SQL or linked migrations with RLS.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on profiles (email);
