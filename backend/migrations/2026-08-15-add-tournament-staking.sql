-- PryzePot: per-participant staking for scheduled tournaments
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- match_type/scheduled_time on tournaments already exist from
-- 2026-08-15-add-scheduling-and-staking.sql - that file explicitly deferred
-- tournament staking because it's a different shape from matches (per-
-- participant, not per-creator). This file fills that in.
--
-- Every ADD COLUMN / CREATE TABLE / CREATE INDEX statement is guarded with
-- IF NOT EXISTS and is safe to re-run.

-- 1. Tournament-wide staking-window resolution. Unlike matches (one
--    creator), a tournament has N participants who can each opt into
--    staking, but they all share the same bracket start time - so the
--    "staking window closes" moment is one timestamp for the whole
--    tournament, not one per participant. Mirrors matches.stake_resolved_at
--    (see resolveExpiredStakes in server.js); resolveExpiredTournamentStakes
--    stamps this once and then computes each opted-in participant's
--    fallback_amount below in the same pass.
alter table public.tournaments add column if not exists stake_resolved_at bigint;

-- 2. Per-participant staking fields. staking_enabled/own_stake_amount are
--    set at join time (or at tournament-creation time for the creator's own
--    slot); fallback_amount is filled in later by
--    resolveExpiredTournamentStakes, same liability-record-only meaning as
--    matches.creator_fallback_amount - no payment processor is connected
--    yet, so nothing actually charges anyone when this gets set.
alter table public.tournament_players add column if not exists staking_enabled boolean not null default false;
alter table public.tournament_players add column if not exists own_stake_amount numeric(10,2);
alter table public.tournament_players add column if not exists fallback_amount numeric(10,2);

do $$ begin
    alter table public.tournament_players add constraint tournament_players_own_stake_amount_check
        check (
            (staking_enabled = false and own_stake_amount is null)
            or (staking_enabled = true and own_stake_amount is not null and own_stake_amount > 0)
        );
exception when duplicate_object then null; end $$;

-- 3. Individual stakers, one row per (staker, staked-on participant) pair.
--    staked_username is which bracket participant the stake backs; that
--    participant's own entry fee is the pool being divided, same rule as
--    match_stakes. sum(own_stake_amount, tournament_stakes.amount) <=
--    entry_fee is enforced at the application layer (the stake-creation
--    route), matching every other cross-row validation in this codebase.
create table if not exists public.tournament_stakes (
    id bigint generated always as identity primary key,
    tournament_id bigint not null references public.tournaments(id) on delete cascade,
    staked_username text not null,
    staker_username text not null,
    amount numeric(10,2) not null check (amount > 0),
    created_at bigint not null,
    refunded_at bigint
);

create index if not exists tournament_stakes_tournament_id_idx on public.tournament_stakes(tournament_id);
create index if not exists tournament_stakes_staked_username_idx on public.tournament_stakes(tournament_id, staked_username);

-- 4. Staking payout breakdown, computed once by calculatePayoutBreakdown()
--    in backend/payout-math.js when the tournament's final match completes
--    and a champion is decided - same durable-record shape as
--    match_payouts, just keyed by tournament_id instead of match_id.
create table if not exists public.tournament_payouts (
    id bigint generated always as identity primary key,
    tournament_id bigint not null references public.tournaments(id) on delete cascade,
    username text not null,
    share numeric(6,5) not null check (share >= 0 and share <= 1),
    amount numeric(10,2) not null,
    created_at bigint not null,
    paid_at bigint,
    unique (tournament_id, username)
);

create index if not exists tournament_payouts_tournament_id_idx on public.tournament_payouts(tournament_id);
create index if not exists tournament_payouts_username_idx on public.tournament_payouts(username);
