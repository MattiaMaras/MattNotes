-- "I tuoi PDF": private Storage bucket for uploaded PDFs, RLS scoped to the
-- Clerk user id (same ownership model as sync_items, see 0002), and a new
-- `pdfdocument` sync_items kind for the metadata (title, storage path, page
-- count, companion note id, highlights) — the binary itself never goes
-- through sync_items, only this bucket.
--
-- Objects are stored at `{ownerId}/{pdfId}.pdf`; RLS checks that the first
-- path segment (`storage.foldername(name)[1]`) matches the caller's Clerk
-- user id from the validated session JWT.

insert into storage.buckets (id, name, public, file_size_limit)
values ('pdfs', 'pdfs', false, 52428800) -- 50MB
on conflict (id) do nothing;

drop policy if exists "owner can read pdfs" on storage.objects;
create policy "owner can read pdfs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );

drop policy if exists "owner can upload pdfs" on storage.objects;
create policy "owner can upload pdfs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pdfs'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );

drop policy if exists "owner can update pdfs" on storage.objects;
create policy "owner can update pdfs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'pdfs'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );

drop policy if exists "owner can delete pdfs" on storage.objects;
create policy "owner can delete pdfs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (select auth.jwt() ->> 'sub') = (storage.foldername(name))[1]
  );

-- Allow the new metadata kind alongside notebook/note/flashcard.
alter table public.sync_items drop constraint if exists sync_items_kind_check;
alter table public.sync_items
  add constraint sync_items_kind_check
  check (kind in ('notebook', 'note', 'flashcard', 'pdfdocument'));
