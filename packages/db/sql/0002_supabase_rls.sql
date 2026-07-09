-- Run on Supabase (preset: supabase-full) after profiles table exists.
-- Pattern from AtoEnglish: owner-only rows.

alter table profiles enable row level security;

create policy "profiles_select_own"
  on profiles for select
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on profiles for insert
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
