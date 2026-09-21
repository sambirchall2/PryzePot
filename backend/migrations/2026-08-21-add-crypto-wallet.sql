-- PryzePot: crypto deposit/withdrawal tables, sitting on top of the
-- existing balance_ledger (2026-08-17-add-staking-escrow-and-ledger.sql).
-- Run this once in the Supabase SQL editor. Every statement is guarded
-- with IF NOT EXISTS and is safe to re-run.
--
-- WHY: the plan (see chat) is custodial-but-not-us - real USDC sits in
-- per-user wallets at a licensed custody provider (Circle Developer-
-- Controlled Wallets to start), not in an account we personally hold
-- keys to. That custodian is the system of record for the actual crypto.
-- Vault Credits (users.balance / balance_ledger) stays the system of
-- record for in-game ownership - stakes, payouts, disputes all keep
-- working exactly as they do today, untouched by any of this. These
-- three tables are only the two edges where the two systems touch:
-- crediting a Vault Credits balance when a deposit is confirmed on
-- chain, and debiting it when a withdrawal is requested/sent. No table
-- here is ever the source of truth for "how much does this user have" -
-- that's still users.balance, adjusted only through adjustBalance().
--
-- PRECISION NOTE: balance_ledger.delta and match_stakes.amount are
-- numeric(10,2) - cents. USDC has 6 decimal places on chain. We do NOT
-- change the existing money columns to match (that's a much bigger,
-- riskier change touching every existing balance/stake/payout path).
-- Instead these new tables record the real on-chain amount at full
-- precision, and credited_amount/amount (numeric(10,2)) record what
-- actually got rounded to the cent and passed to adjustBalance(). The
-- rounding remainder (a fraction of a cent per transaction) is an
-- accepted, tiny, one-directional cost of keeping the existing ledger
-- untouched - flag if that stops being acceptable at higher volume.

-- 1. One deposit address per user (per chain/asset - schema allows more
--    than one later without a redesign, even though we're launching
--    with a single chain/asset). circle_wallet_id is Circle's wallet id;
--    address is the actual on-chain address shown to the user as a QR
--    code / copy target.
create table if not exists public.crypto_deposit_addresses (
    id bigint generated always as identity primary key,
    username text not null,
    chain text not null default 'BASE',
    asset text not null default 'USDC',
    circle_wallet_id text not null,
    address text not null,
    created_at bigint not null
);

create unique index if not exists crypto_deposit_addresses_user_chain_asset_idx
    on public.crypto_deposit_addresses(username, chain, asset);
create index if not exists crypto_deposit_addresses_wallet_idx
    on public.crypto_deposit_addresses(circle_wallet_id);

-- 2. One row per inbound on-chain transfer we've seen. status walks
--    pending_confirmation -> confirmed -> credited, or -> failed.
--    circle_notification_id + (chain, tx_hash) are both unique so a
--    redelivered webhook (Circle guarantees at-least-once delivery)
--    can never double-credit a user - the webhook handler upserts on
--    tx_hash and only calls adjustBalance() the first time a row moves
--    into 'credited'.
create table if not exists public.crypto_deposits (
    id bigint generated always as identity primary key,
    username text not null,
    deposit_address_id bigint references public.crypto_deposit_addresses(id),
    circle_wallet_id text,
    chain text not null,
    asset text not null,
    tx_hash text,
    onchain_amount numeric(18,6) not null,
    credited_amount numeric(10,2),
    status text not null default 'pending_confirmation',
    confirmations integer,
    circle_notification_id text,
    detected_at bigint not null,
    confirmed_at bigint,
    credited_at bigint
);

do $$ begin
    alter table public.crypto_deposits add constraint crypto_deposits_status_check
        check (status in ('pending_confirmation', 'confirmed', 'credited', 'failed'));
exception when duplicate_object then null; end $$;

create unique index if not exists crypto_deposits_chain_txhash_idx
    on public.crypto_deposits(chain, tx_hash) where tx_hash is not null;
create unique index if not exists crypto_deposits_notification_idx
    on public.crypto_deposits(circle_notification_id) where circle_notification_id is not null;
create index if not exists crypto_deposits_username_idx on public.crypto_deposits(username);

-- 3. One row per withdrawal request. pending_review is the manual gate -
--    every request starts here and needs an admin to approve before
--    anything is sent, regardless of how confident the automated risk
--    checks are. Once legal/compliance posture is settled this gate can
--    be relaxed (auto-approve under some threshold) without a schema
--    change - it's just whether the approve step runs itself.
--    ledger_hold_id points at the balance_ledger row created when we
--    debit the user's Vault Credits at request time, so a rejected
--    withdrawal has a clean, audited reversal (see routes file).
create table if not exists public.crypto_withdrawals (
    id bigint generated always as identity primary key,
    username text not null,
    to_address text not null,
    chain text not null default 'BASE',
    asset text not null default 'USDC',
    amount numeric(10,2) not null,
    onchain_amount numeric(18,6),
    status text not null default 'pending_review',
    ledger_hold_id bigint,
    circle_transfer_id text,
    tx_hash text,
    requested_at bigint not null,
    reviewed_by text,
    reviewed_at bigint,
    rejection_reason text,
    sent_at bigint
);

do $$ begin
    alter table public.crypto_withdrawals add constraint crypto_withdrawals_status_check
        check (status in ('pending_review', 'approved', 'rejected', 'sending', 'sent', 'failed'));
exception when duplicate_object then null; end $$;

create index if not exists crypto_withdrawals_username_idx on public.crypto_withdrawals(username);
create index if not exists crypto_withdrawals_status_idx on public.crypto_withdrawals(status);
create unique index if not exists crypto_withdrawals_transfer_idx
    on public.crypto_withdrawals(circle_transfer_id) where circle_transfer_id is not null;
