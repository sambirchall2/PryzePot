-- PryzePot: add Madden NFL support (screenshot-verified matches)
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Every ADD COLUMN / CREATE TABLE / CREATE INDEX statement is guarded with
-- IF NOT EXISTS and is safe to re-run; the ADD CONSTRAINT statements are
-- wrapped in do $$ ... exception when duplicate_object then null; end $$;
-- for the same reason, matching every prior migration in this folder.
--
-- DEVIATIONS FROM A LITERAL "id/fk" SCHEMA (see chat) - kept consistent with
-- the rest of this database rather than introducing a new identity model:
--   1. There is no match_players join table - matches store both
--      participants as flat creator_*/opponent_* columns (see
--      creator_username/opponent_username/creator_tag/creator_stake_amount
--      etc. on public.matches already). team_selection follows that same
--      prefix pattern instead of living in a join table that doesn't exist.
--   2. Every "*_id (fk)" for a PLAYER or ADMIN below is instead a
--      "*_username text" column with no FK constraint - matches,
--      match_stakes, and match_payouts all identify players by username
--      only (no users.id FK exists anywhere in this schema today, including
--      the is_admin check in server.js), so player_id/winner_player_id/
--      resolved_by_admin_id become player_username/winner_username/
--      resolved_by_admin_username to match.
--   3. Timestamp-shaped columns are bigint epoch-milliseconds, not
--      timestamp/timestamptz - same reasoning as scheduled_time/
--      stake_resolved_at in 2026-08-15-add-scheduling-and-staking.sql: the
--      JS backend compares these directly against Date.now().
--   4. Enums are text + check constraints, not native Postgres enum types -
--      matches match_type/staking's existing style, and avoids native
--      enums' transactional ADD VALUE restriction if these lists grow.
--
-- NOT done here (out of scope for this pass, flagging so it isn't assumed
-- covered): tournament_matches / tournament_players get none of these
-- columns, so Madden is 1v1-only until/unless tournament support is
-- explicitly requested.

-- 1. EA account name on the user profile. Separate from any PSN/Xbox
--    gamertag column, persists across matches once set (mirrors chess_name/
--    clash_tag - set once at account level, not per-match).
alter table public.users add column if not exists ea_name text;

-- 2. Madden-specific fields on matches. platform/skill_difficulty are
--    nullable and simply unused by Clash/Chess rows. verification_method
--    defaults to 'api' at the column level so every existing Clash/Chess
--    row (and any future non-Madden game) gets it automatically; the
--    backend sets it explicitly to 'manual_report' on Madden match
--    creation.
alter table public.matches add column if not exists platform text;
alter table public.matches add column if not exists skill_difficulty text;
alter table public.matches add column if not exists verification_method text not null default 'api';
alter table public.matches add column if not exists rules_acknowledged_at bigint;
alter table public.matches add column if not exists setup_ready_at bigint;

do $$ begin
    alter table public.matches add constraint matches_platform_check
        check (platform is null or platform in ('ps5_xbox', 'pc'));
exception when duplicate_object then null; end $$;

do $$ begin
    alter table public.matches add constraint matches_skill_difficulty_check
        check (skill_difficulty is null or skill_difficulty in ('rookie', 'pro', 'all_pro', 'all_madden'));
exception when duplicate_object then null; end $$;

do $$ begin
    alter table public.matches add constraint matches_verification_method_check
        check (verification_method in ('api', 'manual_report'));
exception when duplicate_object then null; end $$;

-- 3. Team selection - set after each side joins, not at match creation.
--    Flat creator_*/opponent_* columns, matching every other per-player
--    field already on matches (see deviation #1 above).
alter table public.matches add column if not exists creator_team_selection text;
alter table public.matches add column if not exists opponent_team_selection text;

-- 4. Self-reported result per player. One row per player per match; the
--    verification bot/admin compares the two reports against uploaded
--    screenshots (see match_verifications/match_screenshots below).
create table if not exists public.match_result_reports (
    id bigint generated always as identity primary key,
    match_id bigint not null references public.matches(id) on delete cascade,
    player_username text not null,
    reported_result text not null check (reported_result in ('win', 'loss')),
    created_at bigint not null
);

create index if not exists match_result_reports_match_id_idx on public.match_result_reports(match_id);

-- 5. One verification record per match needing screenshot-based resolution.
--    queue_tag buckets it for an admin queue view (which bucket, not
--    resolution state - status already tracks that) so it's independently
--    nullable/queryable rather than derived from status.
create table if not exists public.match_verifications (
    id bigint generated always as identity primary key,
    match_id bigint not null references public.matches(id) on delete cascade,
    status text not null default 'pending'
        check (status in ('pending', 'auto_resolved', 'needs_review', 'disputed', 'resolved_by_admin')),
    queue_tag text check (queue_tag is null or queue_tag in ('needs_review', 'dispute')),
    winner_username text,
    resolution_method text check (resolution_method is null or resolution_method in ('agreement', 'bot', 'admin')),
    resolved_by_admin_username text,
    resolved_at bigint,
    created_at bigint not null
);

create index if not exists match_verifications_match_id_idx on public.match_verifications(match_id);
create index if not exists match_verifications_queue_tag_idx on public.match_verifications(queue_tag);

-- 6. Screenshot uploads + bot OCR/read results, one row per screenshot.
--    bot_extracted_team_1/2 + bot_extracted_score_1/2 are the raw read for
--    each side; a human (or the resolution logic) diffs them against the
--    two match_result_reports rows and the players' team_selection.
create table if not exists public.match_screenshots (
    id bigint generated always as identity primary key,
    match_verification_id bigint not null references public.match_verifications(id) on delete cascade,
    player_username text not null,
    storage_path text not null,
    bot_read_status text not null default 'not_processed'
        check (bot_read_status in ('not_processed', 'processed_confident', 'processed_low_confidence', 'processed_error')),
    bot_extracted_team_1 text,
    bot_extracted_score_1 integer,
    bot_extracted_team_2 text,
    bot_extracted_score_2 integer,
    bot_confidence_notes text,
    created_at bigint not null
);

create index if not exists match_screenshots_match_verification_id_idx on public.match_screenshots(match_verification_id);
