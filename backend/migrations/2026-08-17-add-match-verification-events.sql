-- PryzePot: audit log for match_verifications (Madden dispute/verification trail)
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Purely additive - one new table - safe to re-run (IF NOT EXISTS).
--
-- WHY A SEPARATE APPEND-ONLY TABLE, NOT JUST READING match_result_reports/
-- match_screenshots/match_verifications DIRECTLY: those three tables are
-- mutable-by-design (a player can change their reported result before their
-- opponent reports; a re-uploaded screenshot overwrites the previous row's
-- bot read) - see POST /api/matches/:id/report-result and POST /api/matches/
-- :id/screenshot in server.js, both of which UPDATE an existing row instead
-- of inserting a new one when one already exists. That's the right choice
-- for those tables (only the latest report/screenshot should ever be acted
-- on), but it means the history of "what did this player report first,
-- before they changed it" is lost. match_verification_events is insert-only
-- and never updated, so it's the actual audit trail: who reported what and
-- when (including changed-their-mind reports), what the bot extracted on
-- each pass, who resolved the case (agreement/bot/admin) and when, and any
-- admin penalty applied. Mirrors the existing admin_actions table's
-- insert-only, never-updated shape (see POST /api/admin/disputes/:id/
-- resolve) rather than inventing a new logging pattern.
--
-- event_type is intentionally a flat enum rather than one table per event
-- kind - every event here is "something happened to this match_verification
-- at a point in time", and a single ordered timeline (one query, one
-- order by created_at) is exactly what "who reported what, what the bot
-- extracted, who resolved it, and when" needs. actor_username is null for
-- system/bot-generated events (bot_extraction, and the auto-resolved leg of
-- a 'resolved' event) - there is no bot/system user account in this schema
-- to attribute those to.
create table if not exists public.match_verification_events (
    id bigint generated always as identity primary key,
    match_verification_id bigint not null references public.match_verifications(id) on delete cascade,
    event_type text not null check (event_type in (
        'result_reported', 'screenshot_uploaded', 'bot_extraction',
        'disputed', 'resolved', 'penalty_applied'
    )),
    actor_username text,
    winner_username text,
    resolution_method text check (resolution_method is null or resolution_method in ('agreement', 'bot', 'admin')),
    details text,
    created_at bigint not null
);

create index if not exists match_verification_events_verification_id_idx
    on public.match_verification_events(match_verification_id);

-- Supports "has this player kept ending up in disputes" pattern-spotting
-- (see chat) - filtering all events by who triggered them, across matches.
create index if not exists match_verification_events_actor_username_idx
    on public.match_verification_events(actor_username);
