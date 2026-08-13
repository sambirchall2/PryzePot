-- PryzePot: add Chess.com support
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF EXISTS / IF NOT EXISTS.

-- 1. Chess account fields on users (mirrors the clash_* columns, but username-only:
--    Chess.com is challenged directly by username, so there is no "friend link".)
alter table public.users add column if not exists chess_username text;
alter table public.users add column if not exists chess_name     text;
alter table public.users add column if not exists chess_rating    integer;
alter table public.users add column if not exists chess_verified   boolean default false;

-- 2. Rename the anti-reuse column to be game-neutral.
--    It stored a Clash battle id; it now stores any external match id
--    (Clash battle id OR Chess.com game uuid). The UNIQUE constraint carries over
--    automatically with the rename, so a game can still only pay out once.
alter table public.match_results      rename column clash_battle_id to external_match_id;
alter table public.tournament_matches rename column clash_battle_id to external_match_id;

-- Note: matches / tournament_players / tournament_matches reuse their existing
-- *_tag and *_friend_link columns for chess:
--   * *_tag         -> the player's Chess.com username (no leading '#')
--   * *_friend_link -> the player's Chess.com profile URL (https://www.chess.com/member/<username>)
-- so no schema change is needed there.
