-- Preserve each source row from the paired credential CSVs. The table has no
-- foreign key to teams: the supplied file also contains registration IDs that
-- do not yet exist in public.teams.
create table if not exists public.team_credentials (
  source_sha256 text not null,
  paired_source_sha256 text not null,
  source_index integer not null check (source_index >= 0),
  source_file text not null,
  paired_source_file text not null,
  team_id text,
  team_leader text,
  username text,
  password text,
  raw_with_id jsonb not null,
  raw_without_id jsonb not null,
  status text not null check (status in ('success', 'partial', 'failed')),
  imported_at timestamptz not null default now(),
  primary key (source_sha256, source_index)
);

alter table public.team_credentials enable row level security;
revoke all on table public.team_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.team_credentials to service_role;

comment on table public.team_credentials is
  'Private, indexed source records from the credential CSV import. Service role only; not a portal authentication table.';
comment on column public.team_credentials.source_index is
  'Zero-based data-row index in each paired CSV, excluding the header.';
comment on column public.team_credentials.team_id is
  'Registration ID from the source CSV, not the UUID primary key of public.teams.';

-- Rollback, if the imported data has been exported and is no longer needed:
-- drop table public.team_credentials;
