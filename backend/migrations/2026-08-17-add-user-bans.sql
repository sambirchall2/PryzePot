-- PryzePot: minimal ban primitive for admin moderation
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Purely additive - safe to re-run (IF NOT EXISTS).
--
-- Mirrors the existing is_active / deactivation pattern (see users.is_active,
-- checked in requireAuth and POST /api/login) rather than inventing a new
-- shape - a ban is the same kind of "block this account" flag, just
-- admin-triggered instead of self-service, so it gets its own boolean
-- rather than overloading is_active (which the user's own account-settings
-- deactivate/reactivate flow already owns).
alter table public.users add column if not exists is_banned boolean not null default false;
alter table public.users add column if not exists ban_reason text;
alter table public.users add column if not exists banned_at bigint;
alter table public.users add column if not exists banned_by_admin_username text;
