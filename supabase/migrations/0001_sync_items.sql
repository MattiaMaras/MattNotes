-- Local-first sync table. Each row mirrors one client entity
-- (notebook | note | flashcard) as a JSON blob, keyed by its client id and
-- scoped to an owner. `updated_at` drives last-write-wins; `deleted` is a soft
-- delete so removals propagate to other devices.
--
-- Applied to the live project on first setup. Kept here so the schema is
-- version-controlled and reproducible.

create table if not exists public.sync_items (
  id uuid primary key,
  owner_id text not null,
  kind text not null check (kind in ('notebook', 'note', 'flashcard')),
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create index if not exists sync_items_owner_idx on public.sync_items (owner_id);
create index if not exists sync_items_owner_kind_idx on public.sync_items (owner_id, kind);

alter table public.sync_items enable row level security;

-- TEMPORARY (pre-auth): the browser uses the public anon key and there is no
-- user JWT yet, so access is open. Step #9 (Clerk) replaces these with policies
-- scoping rows to `auth.jwt()->>'sub' = owner_id`.
drop policy if exists "temp anon full access" on public.sync_items;
create policy "temp anon full access"
  on public.sync_items for all
  to anon
  using (true) with check (true);

drop policy if exists "temp authenticated full access" on public.sync_items;
create policy "temp authenticated full access"
  on public.sync_items for all
  to authenticated
  using (true) with check (true);

-- Broadcast row changes to subscribed clients (realtime sync).
alter publication supabase_realtime add table public.sync_items;
