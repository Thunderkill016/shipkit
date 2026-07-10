-- Supabase RLS for notes (owner only). Run after 0004_notes.sql
alter table notes enable row level security;

create policy "notes_select_own"
  on notes for select
  using ((select auth.uid()::text) = user_id);

create policy "notes_insert_own"
  on notes for insert
  with check ((select auth.uid()::text) = user_id);

create policy "notes_update_own"
  on notes for update
  using ((select auth.uid()::text) = user_id)
  with check ((select auth.uid()::text) = user_id);

create policy "notes_delete_own"
  on notes for delete
  using ((select auth.uid()::text) = user_id);
