-- PryzePot: add Street Fighter 6, Rocket League, League of Legends (manual-report
-- games, no screenshots - self-report agreement pays out instantly; a
-- disagreement goes straight to the existing generic /api/disputes queue,
-- same one every game already uses, not Madden's screenshot/bot-OCR path).
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Every ADD COLUMN is guarded with IF NOT EXISTS and is safe to re-run, matching
-- every prior migration in this folder.

-- 1. Persistent per-account identifiers, one nullable column per game, same
--    pattern as ea_name/chess_username - set once at account level via
--    save-streetfighter/save-rocketleague/save-lol, not per-match.
alter table public.users add column if not exists capcom_id text;
alter table public.users add column if not exists rl_id text;
alter table public.users add column if not exists riot_id text;

-- 2. Repeated-dispute tracking (see chat) - incremented in
--    POST /api/admin/disputes/:id/resolve whenever an admin's resolution
--    contradicts a player's own self-report; account_under_review is a flag
--    for admins to notice, not an automatic restriction.
alter table public.users add column if not exists dispute_strikes integer not null default 0;
alter table public.users add column if not exists account_under_review boolean not null default false;

-- 3. Rocket League-only match fields - nullable, unused by every other game's
--    rows, same as platform/skill_difficulty are Madden-only. The host fills
--    these in (via POST /api/matches/:id/room-info) once they've created the
--    actual Private Match in Rocket League, which is often after an opponent
--    has already joined on PryzePot.
alter table public.matches add column if not exists rl_room_name text;
alter table public.matches add column if not exists rl_room_password text;

-- NOT done here (out of scope for this pass): tournament_matches /
-- tournament_players get none of this - these 3 games are 1v1/Friends-only,
-- same restriction the user asked for.
