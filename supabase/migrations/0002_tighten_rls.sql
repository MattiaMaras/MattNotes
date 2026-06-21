-- SECURITY HARDENING — DO NOT APPLY YET.
--
-- This replaces the temporary open policies from 0001 with per-user policies
-- that scope every row to the signed-in Clerk user. It only works AFTER two
-- manual steps, otherwise it will lock the app out of its own data:
--
--   1. Clerk dashboard → configure Supabase as an integration (or enable the
--      Supabase JWT). https://clerk.com/docs/integrations/databases/supabase
--   2. Supabase dashboard → Authentication → Sign In / Up → Third-Party Auth →
--      add Clerk (paste your Clerk domain). This makes Supabase trust Clerk's
--      session JWT, whose `sub` claim is the Clerk user id.
--
-- Then, in the app, switch the Supabase client to forward the Clerk token:
--   createClient(url, key, { accessToken: async () => session?.getToken() })
-- and the existing `owner_id = clerk userId` already lines up with `sub`.
--
-- Once all of the above is in place, apply this migration.

drop policy if exists "temp anon full access" on public.sync_items;
drop policy if exists "temp authenticated full access" on public.sync_items;

-- Each user may only touch their own rows. `auth.jwt()->>'sub'` is the Clerk
-- user id carried by the validated session token.
create policy "owner can read"
  on public.sync_items for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = owner_id);

create policy "owner can write"
  on public.sync_items for insert
  to authenticated
  with check ((select auth.jwt() ->> 'sub') = owner_id);

create policy "owner can update"
  on public.sync_items for update
  to authenticated
  using ((select auth.jwt() ->> 'sub') = owner_id)
  with check ((select auth.jwt() ->> 'sub') = owner_id);

create policy "owner can delete"
  on public.sync_items for delete
  to authenticated
  using ((select auth.jwt() ->> 'sub') = owner_id);
