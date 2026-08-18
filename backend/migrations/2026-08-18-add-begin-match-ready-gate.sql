-- PryzePot: "Begin Match" ready toggle (both players confirm before
-- gameplay-result reporting unlocks and staking locks)
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Every ADD COLUMN statement is guarded with IF NOT EXISTS and is safe to
-- re-run.
--
-- WHY: see chat. Each player toggles their own readiness on/off in the
-- match room; the match "begins" (started_at stamped) the moment both
-- happen to be ready at once. For 1v1 matches this also closes the
-- staking window (reuses the existing matches.stake_resolved_at field -
-- see 2026-08-15-add-scheduling-and-staking.sql - no new "is staking
-- locked" flag needed, everything that already checks stake_resolved_at
-- keeps working unchanged). Tournament bracket matches get the identical
-- ready-gate shape for unlocking verification, but deliberately do NOT
-- touch tournament-level staking - that locks separately, when the
-- tournament's first round starts (see chat), since a tournament has many
-- bracket matches, not one "the match" moment.

alter table public.matches add column if not exists creator_ready_at bigint;
alter table public.matches add column if not exists opponent_ready_at bigint;
alter table public.matches add column if not exists match_started_at bigint;

alter table public.tournament_matches add column if not exists player_one_ready_at bigint;
alter table public.tournament_matches add column if not exists player_two_ready_at bigint;
alter table public.tournament_matches add column if not exists started_at bigint;
