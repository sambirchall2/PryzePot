// PryzePot: crypto wallet HTTP routes.
//
// A separate file rather than more code inside server.js on purpose -
// server.js is already 270KB+ and this is a self-contained feature with
// its own review/testing surface. Two functions are called from
// server.js (see the wiring notes below and in server.js itself) and
// need requireAuth/requireAdminSession/adjustBalance passed in since
// those live in server.js itself:
//   - registerCryptoWalletWebhook(app, { adjustBalance }) - MUST be
//     called before app.use(express.json())
//   - registerCryptoWalletRoutes(app, { requireAuth, requireAdminSession,
//     adjustBalance }) - called wherever else routes get registered
//
// MONEY-MOVEMENT MODEL (see chat for the full reasoning):
//   - users.balance / balance_ledger (Vault Credits) stays the ONLY
//     source of truth for who owns what during gameplay. Nothing here
//     changes how stakes/payouts/disputes work.
//   - Each user gets one individual Circle-custodied wallet, used only
//     as a deposit-attribution address - never held long-term.
//   - The moment a deposit is confirmed, funds are swept out of that
//     personal wallet into ONE treasury wallet (CIRCLE_TREASURY_WALLET_ID).
//     Reasoning: Vault Credits circulate between users purely in
//     Postgres during play, completely decoupled from which specific
//     on-chain wallet happens to hold funds - so by the time anyone
//     withdraws, the USDC backing their balance is almost certainly NOT
//     sitting in their own deposit wallet anymore. Withdrawals need one
//     predictable, always-funded source, not "wherever this user's
//     original deposit happened to land."
//   - Withdrawals always send FROM the treasury wallet TO the user's
//     external address, and always require admin approval before
//     anything is sent - see task-list/chat for why that gate exists
//     and how to relax it later.
//
// RAW BODY REQUIREMENT: the Circle webhook route needs the untouched
// request bytes to verify the signature (see circle-wallets.js), so it
// applies express.raw() to itself, scoped to just that one route. That
// only works if registerCryptoWalletWebhook() runs BEFORE server.js's
// global app.use(express.json()) - see the wiring note directly above
// that function's definition below.

const express = require("express");
const supabase = require("./supabase");
const circleWallets = require("./circle-wallets");

const CIRCLE_TREASURY_WALLET_ID = process.env.CIRCLE_TREASURY_WALLET_ID;
const CIRCLE_TREASURY_ADDRESS = process.env.CIRCLE_TREASURY_ADDRESS;

// IMPORTANT WIRING NOTE: server.js calls `app.use(express.json())`
// globally near the top of the file (before any routes are defined).
// Express runs middleware in registration order, so by the time ANY
// route registered after that line executes, the body has already been
// consumed and parsed as JSON - there is no way to get the raw bytes
// back for signature verification at that point. That means
// registerCryptoWalletWebhook() (below) MUST be called BEFORE
// `app.use(express.json())` in server.js, not alongside the rest of the
// crypto routes. This is safe to do early even though adjustBalance
// isn't textually defined until later in server.js - it's declared with
// `async function adjustBalance(...)`, which JS fully hoists, so the
// reference is valid as soon as server.js starts executing, regardless
// of where in the file it's passed in from. See the exact insertion
// point called out in server.js's own comment where this is wired in.
function registerCryptoWalletWebhook(app, deps) {
    const adjustBalance = deps.adjustBalance;

    // --- Circle webhook: inbound deposit confirmed --------------------
    // Needs the raw, unparsed body for signature verification (see
    // circle-wallets.js) - express.raw() here, scoped to just this one
    // route, is what makes that possible as long as this function runs
    // before the app-wide express.json() middleware is registered.
    app.post("/api/wallet/webhooks/circle", express.raw({ type: "application/json" }), async function (req, res) {
        const signature = req.headers["x-circle-signature"];
        const keyId = req.headers["x-circle-key-id"];

        let verified = false;
        try {
            verified = await circleWallets.verifyWebhookSignature(req.body, signature, keyId);
        } catch (error) {
            console.log("CIRCLE WEBHOOK SIGNATURE CHECK ERROR:", error.message);
        }

        if (!verified) {
            // Do NOT process anything balance-affecting off an
            // unverified webhook. See the TODO in circle-wallets.js -
            // until CIRCLE_NOTIFICATION_KEY_URL_BASE is confirmed and
            // set, every webhook lands here and is logged, not trusted.
            console.log("CIRCLE WEBHOOK REJECTED - signature not verified. keyId:", keyId);
            res.status(401).json({ success: false });
            return;
        }

        let payload;
        try {
            payload = JSON.parse(req.body.toString("utf8"));
        } catch (error) {
            res.status(400).json({ success: false });
            return;
        }

        const notificationId = payload.notificationId;
        const notificationType = payload.notificationType;
        const notification = payload.notification || {};

        // Only inbound transfers into wallets we created can credit a
        // balance. Everything else (outbound transfer state changes,
        // etc.) is acknowledged and ignored here.
        if (notificationType !== "transactions.inbound") {
            res.status(200).json({ success: true, ignored: true });
            return;
        }

        // TODO: confirm the exact field names/values Circle uses for a
        // finalized inbound transfer state (e.g. "COMPLETE" /
        // "CONFIRMED") against current docs before relying on this in
        // production - shown here with the most likely shape based on
        // the general transaction state machine docs reference.
        const state = notification.state;
        const isFinal = state === "COMPLETE" || state === "CONFIRMED";

        if (!isFinal) {
            res.status(200).json({ success: true, pending: true });
            return;
        }

        const txHash = notification.txHash;
        const destinationWalletId = notification.walletId || notification.destinationWalletId;
        const amounts = notification.amounts || [];
        const onchainAmount = Number(amounts[0]) || 0;

        if (!txHash || !destinationWalletId || !(onchainAmount > 0)) {
            console.log("CIRCLE WEBHOOK - missing fields, not crediting:", JSON.stringify(notification));
            res.status(200).json({ success: true, incomplete: true });
            return;
        }

        // Idempotency: unique index on (chain, tx_hash) and on
        // circle_notification_id means a redelivered webhook (Circle
        // guarantees at-least-once) hits a duplicate-key error here and
        // never reaches the adjustBalance() call below a second time.
        const addressRow = await supabase
            .from("crypto_deposit_addresses")
            .select("username, chain, asset")
            .eq("circle_wallet_id", destinationWalletId)
            .maybeSingle();

        if (!addressRow.data) {
            console.log("CIRCLE WEBHOOK - unknown destination wallet, not crediting:", destinationWalletId);
            res.status(200).json({ success: true, unknownWallet: true });
            return;
        }

        const username = addressRow.data.username;
        const creditedAmount = Math.round(onchainAmount * 100) / 100; // cents - see precision note in the migration

        const insertResult = await supabase
            .from("crypto_deposits")
            .insert({
                username: username,
                circle_wallet_id: destinationWalletId,
                chain: addressRow.data.chain,
                asset: addressRow.data.asset,
                tx_hash: txHash,
                onchain_amount: onchainAmount,
                credited_amount: creditedAmount,
                status: "credited",
                circle_notification_id: notificationId,
                detected_at: Date.now(),
                confirmed_at: Date.now(),
                credited_at: Date.now()
            })
            .select()
            .single();

        if (insertResult.error) {
            // Duplicate-key = we've already credited this exact tx/
            // notification before. Anything else is a real error.
            if (insertResult.error.code === "23505") {
                res.status(200).json({ success: true, duplicate: true });
                return;
            }

            console.log("CRYPTO DEPOSIT INSERT ERROR:", username, txHash, insertResult.error);
            res.status(500).json({ success: false });
            return;
        }

        const credit = await adjustBalance(username, creditedAmount, "crypto_deposit", "crypto_deposit", insertResult.data.id);

        if (!credit.success) {
            console.log("CRYPTO DEPOSIT - adjustBalance FAILED, needs manual fix:", username, creditedAmount, credit.message);
        }

        // Best-effort sweep into the treasury wallet. Deliberately does
        // NOT block or fail the webhook response if it errors - the
        // user's Vault Credits are already correctly credited above,
        // which is the part that must not fail silently. A failed sweep
        // just means this specific deposit wallet holds funds a bit
        // longer than intended; log it for manual/admin follow-up
        // rather than retrying automatically here and risking a double
        // sweep.
        if (CIRCLE_TREASURY_WALLET_ID && CIRCLE_TREASURY_ADDRESS) {
            try {
                await circleWallets.transferOnChain({
                    sourceWalletId: destinationWalletId,
                    toAddress: CIRCLE_TREASURY_ADDRESS,
                    amount: onchainAmount
                });
            } catch (error) {
                console.log("SWEEP TO TREASURY FAILED (non-fatal, needs manual follow-up):", username, destinationWalletId, error.message);
            }
        }

        res.status(200).json({ success: true });
    });
}

// All routes EXCEPT the webhook - these can be registered anywhere else
// routes normally get registered in server.js, since they don't care
// about express.json() vs express.raw().
function registerCryptoWalletRoutes(app, deps) {
    const requireAuth = deps.requireAuth;
    const requireAdminSession = deps.requireAdminSession;
    const adjustBalance = deps.adjustBalance;

    // --- User: get (or create) my deposit address --------------------
    app.get("/api/wallet/deposit-address", requireAuth, async function (req, res) {
        if (!circleWallets.isConfigured()) {
            res.status(503).json({
                success: false,
                message: "Crypto deposits aren't turned on yet."
            });
            return;
        }

        try {
            const wallet = await circleWallets.getOrCreateDepositWallet(req.username);
            res.json({ success: true, wallet: wallet });
        } catch (error) {
            console.log("GET DEPOSIT ADDRESS ERROR:", req.username, error.message);
            res.status(500).json({
                success: false,
                message: "Could not get a deposit address right now. Try again shortly."
            });
        }
    });

    // --- User: request a withdrawal ------------------------------------
    app.post("/api/wallet/withdrawals", requireAuth, async function (req, res) {
        const username = req.username;
        const amount = Math.round((Number(req.body.amount) || 0) * 100) / 100;
        const toAddress = String(req.body.toAddress || "").trim();

        if (!(amount > 0)) {
            res.json({ success: false, message: "Enter a withdrawal amount greater than 0." });
            return;
        }

        if (!toAddress) {
            res.json({ success: false, message: "Enter a destination address." });
            return;
        }

        // Hold the funds immediately (mirrors how match/tournament
        // staking holds via adjustBalance - see stakes routes) so the
        // same Vault Credits can't be staked AND withdrawn at once.
        // Rejection reverses this exact debit (see reject route below).
        const debit = await adjustBalance(username, -amount, "crypto_withdrawal_hold", "crypto_withdrawal", null);

        if (!debit.success) {
            res.json({ success: false, message: "Not enough Vault Credits to withdraw that amount." });
            return;
        }

        const insertResult = await supabase
            .from("crypto_withdrawals")
            .insert({
                username: username,
                to_address: toAddress,
                chain: circleWallets.CIRCLE_BLOCKCHAIN,
                asset: "USDC",
                amount: amount,
                status: "pending_review",
                requested_at: Date.now()
            })
            .select()
            .single();

        if (insertResult.error || !insertResult.data) {
            console.log("CREATE WITHDRAWAL ERROR:", username, insertResult.error);
            await adjustBalance(username, amount, "crypto_withdrawal_hold_rollback", "crypto_withdrawal", null);
            res.json({ success: false, message: "Could not record withdrawal request." });
            return;
        }

        res.json({ success: true, withdrawal: insertResult.data });
    });

    // --- User: my withdrawal history ------------------------------------
    app.get("/api/wallet/withdrawals", requireAuth, async function (req, res) {
        const result = await supabase
            .from("crypto_withdrawals")
            .select("*")
            .eq("username", req.username)
            .order("requested_at", { ascending: false });

        res.json({ success: true, withdrawals: result.data || [] });
    });

    // --- Admin: withdrawal review queue ----------------------------------
    app.get("/api/admin/wallet/withdrawals", requireAdminSession, async function (req, res) {
        const result = await supabase
            .from("crypto_withdrawals")
            .select("*")
            .eq("status", "pending_review")
            .order("requested_at", { ascending: true });

        res.json({ success: true, withdrawals: result.data || [] });
    });

    // --- Admin: approve + actually send -----------------------------------
    app.post("/api/admin/wallet/withdrawals/:id/approve", requireAdminSession, async function (req, res) {
        const id = Number(req.params.id);

        const found = await supabase.from("crypto_withdrawals").select("*").eq("id", id).maybeSingle();

        if (!found.data) {
            res.json({ success: false, message: "Withdrawal not found." });
            return;
        }

        if (found.data.status !== "pending_review") {
            res.json({ success: false, message: "This withdrawal already left pending_review." });
            return;
        }

        if (!CIRCLE_TREASURY_WALLET_ID) {
            res.json({ success: false, message: "CIRCLE_TREASURY_WALLET_ID not configured." });
            return;
        }

        await supabase
            .from("crypto_withdrawals")
            .update({ status: "sending", reviewed_by: req.username, reviewed_at: Date.now() })
            .eq("id", id);

        try {
            const transfer = await circleWallets.transferOnChain({
                sourceWalletId: CIRCLE_TREASURY_WALLET_ID,
                toAddress: found.data.to_address,
                amount: found.data.amount
            });

            await supabase
                .from("crypto_withdrawals")
                .update({ circle_transfer_id: transfer.circleTransactionId })
                .eq("id", id);

            // Final status (sent / failed + txHash) is set by the
            // transactions.outbound webhook once Circle confirms it on
            // chain, not here - this call only kicks the transfer off.
            res.json({ success: true, message: "Withdrawal sent to Circle for processing." });
        } catch (error) {
            console.log("WITHDRAWAL SEND ERROR:", id, error.message);

            await supabase.from("crypto_withdrawals").update({ status: "failed" }).eq("id", id);

            res.json({ success: false, message: "Could not send withdrawal - it was NOT re-debited, status set to failed for manual follow-up." });
        }
    });

    // --- Admin: reject + refund the hold -----------------------------------
    app.post("/api/admin/wallet/withdrawals/:id/reject", requireAdminSession, async function (req, res) {
        const id = Number(req.params.id);
        const reason = String(req.body.reason || "").trim();

        const found = await supabase.from("crypto_withdrawals").select("*").eq("id", id).maybeSingle();

        if (!found.data) {
            res.json({ success: false, message: "Withdrawal not found." });
            return;
        }

        if (found.data.status !== "pending_review") {
            res.json({ success: false, message: "This withdrawal already left pending_review." });
            return;
        }

        await adjustBalance(found.data.username, found.data.amount, "crypto_withdrawal_reject_refund", "crypto_withdrawal", id);

        await supabase
            .from("crypto_withdrawals")
            .update({
                status: "rejected",
                reviewed_by: req.username,
                reviewed_at: Date.now(),
                rejection_reason: reason || null
            })
            .eq("id", id);

        res.json({ success: true });
    });
}

module.exports = {
    // MUST be called before app.use(express.json()) in server.js - see
    // the wiring note above registerCryptoWalletWebhook's definition.
    registerCryptoWalletWebhook: registerCryptoWalletWebhook,
    // Can be called anywhere else routes normally get registered.
    registerCryptoWalletRoutes: registerCryptoWalletRoutes
};
