-- Perci Shorti Laser Tag: public leaderboard table (Supabase / Postgres)
-- Paste this into Supabase > SQL Editor > New query > Run.

create table if not exists public.perci_scores (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text    not null check (char_length(name) between 2 and 14 and name ~ '^[A-Z0-9 _.-]+$'),
  character   text    not null check (character in ('perci','miracle','chatgpt','jessica','mixi')),
  score       integer not null check (score between 0 and 15000),
  tags        integer not null check (tags between 0 and 80),
  tagged      integer not null check (tagged between 0 and 80),
  accuracy    integer not null check (accuracy between 0 and 100),
  won         boolean not null default false,
  difficulty  text    not null check (difficulty in ('easy','normal','hard'))
);

create index if not exists perci_scores_score_idx on public.perci_scores (score desc);
create index if not exists perci_scores_created_idx on public.perci_scores (created_at desc);

-- Row Level Security: anyone can read the board and add a score; nobody can edit or delete via the public key.
alter table public.perci_scores enable row level security;

drop policy if exists "public read" on public.perci_scores;
create policy "public read" on public.perci_scores for select to anon using (true);

drop policy if exists "public insert" on public.perci_scores;
create policy "public insert" on public.perci_scores for insert to anon with check (true);
