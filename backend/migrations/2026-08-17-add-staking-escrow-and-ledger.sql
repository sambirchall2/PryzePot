-- PryzePot: staking escrow state machine + platform-wide balance ledger
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Every ADD COLUMN / CREATE TABLE / CREATE INDEX statement is guarded with
-- IF NOT EXISTS and is safe to re-run.
--
-- WHY: legal review requires staked money to be handled as true escrow -
-- held when purchased, released to the staked player only once a
-- competition reaches a legitimate verified result (win OR lose - it is
-- never conditioned on the staked player winning), and refunded to the
-- staker instead if the competition is cancelled, voided, ends in a draw,
-- or the staked player is disqualified/forfeits/is caught cheating. See
-- chat for the full spec. This file adds the `status` state machine
-- (held -> released_to_creator / refunded) to both match_stakes and
-- tournament_stakes, plus a new platform-wide balance_ledger table so
-- every balance-changing action anywhere in the app - not just staking -
-- produces an individual, queryable transaction record.

-- 1. match_stakes: escrow status + resolution bookkeeping. resolved_at is
--    a generic "left held" timestamp set on both release and refund;
--    the existing refunded_at column (2026-08-15-add-stake-refund-
--    tracking.sql) is left in place as-is and keeps being stamped on
--    refunds too, so nothing that already reads refunded_at breaks.
alter table public.match_stakes add column if not exists status text not null default 'held';
alter table public.match_stakes add column if not exists resolved_at bigint;
alter table public.match_stakes add column if not exists released_amount numeric(10,2);
alter table public.match_stakes add column if not exists win_share_amount numeric(10,2);
alter table public.match_stakes add column if not exists refund_reason text;

do $$ begin
    alter table public.match_stakes add constraint match_stakes_status_check
        check (status in ('held', 'released_to_creator', 'refunded'));
exception when duplicate_object then null; end $$;

-- 2. tournament_stakes: identical additive columns, same reasoning.
alter table public.tournament_stakes add column if not exists status text not null default 'held';
alter table public.tournament_stakes add column if not exists resolved_at bigint;
alter table public.tournament_stakes add column if not exists released_amount numeric(10,2);
alter table public.tournament_stakes add column if not exists win_share_amount numeric(10,2);
alter table public.tournament_stakes add column if not exists refund_reason text;

do $$ begin
    alter table public.tournament_stakes add constraint tournament_stakes_status_check
        check (status in ('held', 'released_to_creator', 'refunded'));
exception when duplicate_object then null; end $$;

-- 3. Backfill existing rows so `status` reflects reality instead of every
--    pre-existing row defaulting to 'held' forever. Anything already
--    refunded_at-stamped is refunded; anything on an already-Completed
--    match/tournament that has a matching payout row was released under
--    the old (win-only) rule. Everything else is genuinely still pending
--    and correctly stays 'held'.
update public.match_stakes
    set status = 'refunded', resolved_at = refunded_at, refund_reason = 'backfill_pre_existing_refund'
    where refunded_at is not null and status = 'held';

update public.match_stakes ms
    set status = 'released_to_creator', resolved_at = mp.created_at, released_amount = ms.amount
    from public.matches m, public.match_payouts mp
    where ms.match_id = m.id
      and mp.match_id = m.id
      and mp.username = m.creator_username
      and m.status = 'Completed'
      and ms.status = 'held';

update public.tournament_stakes
    set status = 'refunded', resolved_at = refunded_at, refund_reason = 'backfill_pre_existing_refund'
    where refunded_at is not null and status = 'held';

update public.tournament_stakes ts
    set status = 'released_to_creator', resolved_at = tp.created_at, released_amount = ts.amount
    from public.tournament_payouts tp
    where tp.tournament_id = ts.tournament_id
      and tp.username = ts.staked_username
      and ts.status = 'held';

-- 4. Platform-wide balance ledger. Every call to adjustBalance() in
--    server.js now inserts one row here (see chat) - entry fees, stakes,
--    refunds, prize payouts, admin currency grants, XP-store purchases,
--    everything. `reason` is a short machine-readable tag (e.g.
--    'stake_release', 'entry_fee_debit', 'admin_grant'); reference_type/
--    reference_id optionally point at the row that caused the movement
--    (e.g. ('match_stake', match_stakes.id)) so a given stake's full
--    money trail can be reconstructed with one query.
create table if not exists public.balance_ledger (
    id bigint generated always as identity primary key,
    username text not null,
    delta numeric(10,2) not null,
    balance_after numeric(10,2),
    reason text not null,
    reference_type text,
    reference_id bigint,
    created_at bigint not null
);

create index if not exists balance_ledger_username_idx on public.balance_ledger(username);
create index if not exists balance_ledger_reference_idx on public.balance_ledger(reference_type, reference_id);
