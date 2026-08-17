-- PryzePot: Madden edition (25 / 26) as a display/matching label only
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Purely additive - one nullable column - safe to re-run (IF NOT EXISTS).
--
-- Gameplay, scoring, and verification are identical across Madden editions
-- (see chat) - this column exists purely so players can see/filter which
-- edition a posted match is for before joining (frontend/madden/edition.html,
-- shown on frontend/madden/match-board.js and frontend/madden/match-room.html).
-- Nothing on the backend branches on this value; it's stored and echoed back
-- the same way platform/skill_difficulty already are.
alter table public.matches add column if not exists edition text;

do $$ begin
    alter table public.matches add constraint matches_edition_check
        check (edition is null or edition in ('25', '26'));
exception when duplicate_object then null; end $$;
