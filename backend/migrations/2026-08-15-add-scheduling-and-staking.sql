-- PryzePot: scheduled matches + staking (1v1 / Friends matches only)
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Every ADD COLUMN / CREATE TABLE / CREATE INDEX statement is guarded with
-- IF NOT EXISTS and is safe to re-run. The ALTER COLUMN TYPE statements are
-- also safe to re-run (re-casting to the same type is a no-op).
--
-- NOTE: matches / tournaments / tournament_players / tournament_matches /
-- users have no CREATE TABLE migration checked into this repo - they were
-- created directly in the Supabase SQL editor before this migrations folder
-- existed, so this file only adds to them. match_stakes.match_id below is
-- typed `bigint` on the assumption that matches.id is bigint (the Supabase
-- Studio default identity type) - adjust if your actual matches.id type
-- differs.
--
-- Timestamp columns here (scheduled_time, stake_resolved_at, match_stakes.
-- created_at) are `bigint` epoch-milliseconds, NOT `timestamptz` - matching
-- how matches.created_at/expires_at/verify_expires_at already work today
-- (expireOldMatches() in server.js compares them directly against
-- `Date.now()` via .lt(), which only works against a plain numeric column).
-- Using timestamptz here instead would be inconsistent within the same row
-- and would break straightforward comparisons against Date.now() from JS.

-- 1. Currency precision: NUMERIC(10,2) everywhere money is stored, not
--    INTEGER and not FLOAT/DOUBLE PRECISION. Vault Credits are whole-number
--    only in the app today, but the plan is to transition from Vault
--    Credits to real dollars once a payment processor is connected - at
--    that point staking needs to represent exact cents (e.g. staking 50% of
--    a $25 entry fee is $12.50, which INTEGER can't represent). NUMERIC
--    avoids float rounding entirely, which FLOAT/DOUBLE PRECISION would not.
--
--    users.balance is included here too, even though this feature doesn't
--    otherwise touch it: entry fees and stakes are debited straight out of
--    balance via adjustBalance() -> the adjust_balance Postgres RPC
--    function, and that function is NOT defined in any file in this repo -
--    it exists only in the live Supabase database, created out-of-band via
--    the SQL editor, so its internals can't be inspected or updated here.
--    If balance stayed INTEGER while entry_fee/stakes became NUMERIC,
--    adjust_balance would receive fractional deltas against an integer
--    column and could silently truncate or round real money. After running
--    this migration, manually verify adjust_balance's definition (Supabase
--    Dashboard -> Database -> Functions) still behaves correctly against a
--    NUMERIC balance - this migration can widen the column's type, but it
--    can't see or change what that function does internally.
alter table public.users alter column balance type numeric(10,2) using balance::numeric(10,2);
alter table public.matches alter column entry_fee type numeric(10,2) using entry_fee::numeric(10,2);
alter table public.tournaments alter column entry_fee type numeric(10,2) using entry_fee::numeric(10,2);

-- 2. Scheduling. matches and tournaments are confirmed-separate tables (no
--    shared discriminator column anywhere in the app), so both get their
--    own copy of match_type / scheduled_time.
alter table public.matches add column if not exists match_type text not null default 'instant';
alter table public.matches add column if not exists scheduled_time bigint;
alter table public.tournaments add column if not exists match_type text not null default 'instant';
alter table public.tournaments add column if not exists scheduled_time bigint;

do $$ begin
    alter table public.matches add constraint matches_match_type_check
        check (match_type in ('instant', 'scheduled'));
exception when duplicate_object then null; end $$;

do $$ begin
    alter table public.matches add constraint matches_scheduled_time_check
        check (
            (match_type = 'scheduled' and scheduled_time is not null)
            or (match_type = 'instant' and scheduled_time is null)
        );
exception when duplicate_object then null; end $$;

do $$ begin
    alter table public.tournaments add constraint tournaments_match_type_check
        check (match_type in ('instant', 'scheduled'));
exception when duplicate_object then null; end $$;

do $$ begin
    alter table public.tournaments add constraint tournaments_scheduled_time_check
        check (
            (match_type = 'scheduled' and scheduled_time is not null)
            or (match_type = 'instant' and scheduled_time is null)
        );
exception when duplicate_object then null; end $$;

-- 3. Staking - matches (1v1/Friends) only in this pass. Tournament staking
--    is per-participant (a different shape - staking against N bracket
--    slots, not one creator) and is deferred; see chat.
alter table public.matches add column if not exists staking_enabled boolean not null default false;
alter table public.matches add column if not exists creator_stake_amount numeric(10,2);

do $$ begin
    alter table public.matches add constraint matches_creator_stake_amount_check
        check (
            (staking_enabled = false and creator_stake_amount is null)
            or (staking_enabled = true and creator_stake_amount is not null and creator_stake_amount > 0)
        );
exception when duplicate_object then null; end $$;

-- 4. Fallback resolution record-keeping. This is a LIABILITY RECORD only -
--    no payment processor is connected yet, so nothing actually charges the
--    creator when creator_fallback_amount gets set (see chat). It's
--    intentionally its own column rather than being folded into
--    creator_stake_amount, so wiring up a real charge later is additive -
--    e.g. add a creator_fallback_charged_at column when that day comes -
--    instead of needing to reinterpret what an existing column means.
alter table public.matches add column if not exists stake_resolved_at bigint;
alter table public.matches add column if not exists creator_fallback_amount numeric(10,2);

-- 5. Individual stakers. sum(creator_stake_amount, match_stakes.amount) <=
--    entry_fee is enforced at the APPLICATION layer (in the stake-creation
--    route), not with a DB trigger - Postgres has no plain CHECK for "sum
--    across another table," and every other validation in this codebase
--    (balance checks, entry-fee checks, tournament-slot checks) is
--    application-level with zero DB constraints/triggers today. Keeping
--    this consistent with that rather than introducing the first stored
--    procedure in the schema. Worth revisiting as DB-level defense-in-depth
--    once a real payment processor makes an over-stake actually costly
--    rather than just a display bug.
create table if not exists public.match_stakes (
    id bigint generated always as identity primary key,
    match_id bigint not null references public.matches(id) on delete cascade,
    username text not null,
    amount numeric(10,2) not null check (amount > 0),
    created_at bigint not null
);

create index if not exists match_stakes_match_id_idx on public.match_stakes(match_id);
