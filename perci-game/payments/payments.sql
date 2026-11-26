-- Perci Shorti: ZEV Coins, store items and real-money purchases.
-- Run this once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
-- Players are signed in quietly (Supabase anonymous sign-in), so every wallet belongs to one auth user.
-- Players can only READ their own rows. Coins only change through the functions below.

-- ---------- prices (the server's price list; the game can't change these) ----------
create table if not exists public.zev_items (
  id text primary key, coins int not null, usd_cents int not null,
  once boolean not null default false, per_char boolean not null default false, max_qty int
);
insert into public.zev_items (id, coins, usd_cents, once, per_char, max_qty) values
  ('pack',    3000, 499, true,  false, 1),   -- Supporter Pack: also grants core + over + starter (see zev_spend / zev_grant)
  ('gold',    2500, 499, true,  false, 1),
  ('armor',   1200, 249, false, true,  2),
  ('core',    1500, 299, true,  false, 1),
  ('over',    1500, 299, true,  false, 1),
  ('starter',  800, 199, true,  false, 1),
  ('xp2',      400,  99, false, false, null),
  ('lvl',      900, 199, false, true,  null)
on conflict (id) do update set coins = excluded.coins, usd_cents = excluded.usd_cents, once = excluded.once,
  per_char = excluded.per_char, max_qty = excluded.max_qty;

create table if not exists public.zev_packs (id text primary key, coins int not null, usd_cents int not null);
insert into public.zev_packs (id, coins, usd_cents) values
  ('c500', 500, 99), ('c2800', 2800, 499), ('c6000', 6000, 999), ('c13500', 13500, 1999)
on conflict (id) do update set coins = excluded.coins, usd_cents = excluded.usd_cents;

-- ---------- player data ----------
create table if not exists public.zev_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins int not null default 0 check (coins >= 0),
  earned_today int not null default 0,
  earn_day date not null default current_date,
  last_earn timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.zev_owned (
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null references public.zev_items(id),
  char text not null default '',
  qty int not null default 1,
  primary key (user_id, item, char)
);
-- one-time things bought with money (double XP, level skips) waiting for the game to pick them up
create table if not exists public.zev_pending (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null, char text,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
-- every real-money payment (one row per Stripe PaymentIntent, so a webhook can't credit twice)
create table if not exists public.zev_purchases (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null, what text not null, char text,
  coins int not null default 0, amount_cents int not null, currency text not null default 'usd',
  status text not null, created_at timestamptz not null default now()
);

alter table public.zev_items enable row level security;
alter table public.zev_packs enable row level security;
alter table public.zev_wallets enable row level security;
alter table public.zev_owned enable row level security;
alter table public.zev_pending enable row level security;
alter table public.zev_purchases enable row level security;

-- players read their rows through the policies below; nobody writes these tables directly (only the functions do)
revoke insert, update, delete, truncate on public.zev_items, public.zev_packs, public.zev_wallets, public.zev_owned, public.zev_pending, public.zev_purchases from anon, authenticated;

drop policy if exists "prices are public" on public.zev_items;
create policy "prices are public" on public.zev_items for select using (true);
drop policy if exists "packs are public" on public.zev_packs;
create policy "packs are public" on public.zev_packs for select using (true);
drop policy if exists "own wallet" on public.zev_wallets;
create policy "own wallet" on public.zev_wallets for select using (auth.uid() = user_id);
drop policy if exists "own items" on public.zev_owned;
create policy "own items" on public.zev_owned for select using (auth.uid() = user_id);
drop policy if exists "own pending" on public.zev_pending;
create policy "own pending" on public.zev_pending for select using (auth.uid() = user_id);
drop policy if exists "own purchases" on public.zev_purchases;
create policy "own purchases" on public.zev_purchases for select using (auth.uid() = user_id);

-- ---------- functions the game calls (signed-in player) ----------
create or replace function public.zev_wallet() returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  insert into zev_wallets (user_id) values (uid) on conflict do nothing;
  return json_build_object(
    'coins', (select coins from zev_wallets where user_id = uid),
    'owned', coalesce((select json_agg(json_build_object('item', item, 'char', char, 'qty', qty)) from zev_owned where user_id = uid), '[]'::json),
    'pending', coalesce((select json_agg(json_build_object('item', item, 'char', char)) from zev_pending where user_id = uid and not claimed), '[]'::json));
end $$;

create or replace function public.zev_claim() returns void
language sql security definer set search_path = public as $$
  update zev_pending set claimed = true where user_id = auth.uid() and not claimed;
$$;

-- coins earned by playing: at most 300 per call, one call every 20 seconds, 4000 a day
create or replace function public.zev_earn(p_amount int) returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w zev_wallets; amt int := greatest(0, least(coalesce(p_amount, 0), 300));
begin
  if uid is null then raise exception 'Not signed in'; end if;
  insert into zev_wallets (user_id) values (uid) on conflict do nothing;
  select * into w from zev_wallets where user_id = uid for update;
  if w.earn_day <> current_date then w.earned_today := 0; end if;
  if w.last_earn is not null and now() - w.last_earn < interval '20 seconds' then amt := 0; end if;
  amt := least(amt, greatest(0, 4000 - w.earned_today));
  update zev_wallets set coins = coins + amt, earned_today = w.earned_today + amt, earn_day = current_date,
    last_earn = case when amt > 0 then now() else last_earn end, updated_at = now()
  where user_id = uid returning coins into w.coins;
  return json_build_object('coins', w.coins, 'added', amt);
end $$;

-- spend ZEV Coins on a store item (the server checks the price and the balance)
create or replace function public.zev_spend(p_item text, p_char text default '') returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); it zev_items; bal int; have int; ch text := case when coalesce(p_char, '') in ('perci','miracle','chatgpt','jessica','mixi') then p_char else '' end;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into it from zev_items where id = p_item;
  if not found then raise exception 'No such item'; end if;
  if it.per_char and ch = '' then raise exception 'Pick a fighter first'; end if;
  select qty into have from zev_owned where user_id = uid and item = it.id and char = (case when it.per_char then ch else '' end);
  if it.once and have is not null then raise exception 'You already own that'; end if;
  if it.max_qty is not null and coalesce(have, 0) >= it.max_qty then raise exception 'That one is maxed out'; end if;
  insert into zev_wallets (user_id) values (uid) on conflict do nothing;
  select coins into bal from zev_wallets where user_id = uid for update;
  if bal < it.coins then raise exception 'Not enough coins'; end if;
  update zev_wallets set coins = coins - it.coins, updated_at = now() where user_id = uid returning coins into bal;
  if it.id not in ('xp2', 'lvl') then   -- double XP and level skips are used up right away on the device
    insert into zev_owned (user_id, item, char, qty) values (uid, it.id, case when it.per_char then ch else '' end, 1)
    on conflict (user_id, item, char) do update set qty = zev_owned.qty + 1;
  end if;
  if it.id = 'pack' then   -- the Supporter Pack unlocks three upgrades
    insert into zev_owned (user_id, item, char, qty) select uid, x, '', 1 from unnest(array['core','over','starter']) x on conflict do nothing;
  end if;
  return json_build_object('coins', bal);
end $$;

-- ---------- functions only the payment webhook can call (service role) ----------
create or replace function public.zev_credit(p_user uuid, p_coins int) returns void
language sql security definer set search_path = public as $$
  insert into zev_wallets (user_id, coins) values (p_user, p_coins)
  on conflict (user_id) do update set coins = zev_wallets.coins + excluded.coins, updated_at = now();
$$;
create or replace function public.zev_grant(p_user uuid, p_item text, p_char text default '') returns void
language plpgsql security definer set search_path = public as $$
declare it zev_items; ch text := coalesce(p_char, '');
begin
  select * into it from zev_items where id = p_item;
  if not found then return; end if;
  insert into zev_wallets (user_id) values (p_user) on conflict do nothing;
  if it.id in ('xp2', 'lvl') then
    insert into zev_pending (user_id, item, char) values (p_user, it.id, nullif(ch, ''));
  else
    insert into zev_owned (user_id, item, char, qty) values (p_user, it.id, case when it.per_char then ch else '' end, 1)
    on conflict (user_id, item, char) do update set qty = least(coalesce(it.max_qty, 99), zev_owned.qty + 1);
  end if;
  if it.id = 'pack' then   -- the Supporter Pack unlocks three upgrades
    insert into zev_owned (user_id, item, char, qty) select p_user, x, '', 1 from unnest(array['core','over','starter']) x on conflict do nothing;
  end if;
end $$;

revoke all on function public.zev_credit(uuid, int) from public, anon, authenticated;
revoke all on function public.zev_grant(uuid, text, text) from public, anon, authenticated;
grant execute on function public.zev_credit(uuid, int) to service_role;
grant execute on function public.zev_grant(uuid, text, text) to service_role;
revoke all on function public.zev_wallet() from public, anon;
revoke all on function public.zev_claim() from public, anon;
revoke all on function public.zev_earn(int) from public, anon;
revoke all on function public.zev_spend(text, text) from public, anon;
grant execute on function public.zev_wallet() to authenticated;
grant execute on function public.zev_claim() to authenticated;
grant execute on function public.zev_earn(int) to authenticated;
grant execute on function public.zev_spend(text, text) to authenticated;
