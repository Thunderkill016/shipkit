-- Product Slice Engine: owner-scoped generic product records
create extension if not exists "pgcrypto";

create table if not exists product_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  slice_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_records_owner_slice_idx
  on product_records (user_id, slice_id, created_at desc);
