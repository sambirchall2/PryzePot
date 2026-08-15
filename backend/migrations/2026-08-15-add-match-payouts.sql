-- PryzePot: staking payout breakdown (matches only)
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Separate file from 2026-08-15-add-scheduling-and-staking.sql since that
-- one is already applied - this is purely additive (one new table), so
-- there's no reason to re-run the whole earlier file.
--
-- WHY A SEPARATE TABLE, NOT A JSON COLUMN ON matches:
-- match_stakes already established the pattern of "one row per person per
-- match" as its own table rather than a JSON blob on matches, and payouts
-- are the same shape (one row per recipient per match) plus the same
-- reason to want it queryable later - e.g. "everything user X is owed
-- across all matches" is a straightforward WHERE username = ... scan
-- across rows, not a JSON-parse-and-filter over every match. It also
-- means matches' own row shape doesn't grow every time payout logic
-- changes. paid_at is included now (nullable, unset) so that handing this
-- off to real payment processing later - the file this migration's own
-- comments point to - is just "process rows where paid_at is null",
-- without needing a schema change or recomputing anything, the same
-- future-proofing already used for stake_resolved_at/creator_fallback_amount.
--
-- share/amount are calculated once, at match-completion time, by
-- calculatePayoutBreakdown() in backend/payout-math.js and never
-- recalculated afterward - this table is the durable record of that
-- one-time calculation, not a live view.
create table if not exists public.match_payouts (
    id bigint generated always as identity primary key,
    match_id bigint not null references public.matches(id) on delete cascade,
    username text not null,
    share numeric(6,5) not null check (share >= 0 and share <= 1),
    amount numeric(10,2) not null,
    created_at bigint not null,
    paid_at bigint,
    unique (match_id, username)
);

create index if not exists match_payouts_match_id_idx on public.match_payouts(match_id);
create index if not exists match_payouts_username_idx on public.match_payouts(username);
