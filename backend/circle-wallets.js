// PryzePot: thin adapter around Circle's Developer-Controlled Wallets API.
//
// WHY THIS FILE EXISTS: this is the only place in the codebase that
// should ever know Circle's API shape. Routes (crypto-wallet-routes.js)
// call these functions and never touch the Circle SDK directly - if we
// ever swap custody providers (or add a second one), this is the only
// file that changes.
//
// STATUS AS OF WRITING: every method name and parameter shape below was
// pulled from Circle's current public docs (developers.circle.com) and
// their official GitHub skill examples, not invented - but Circle's SDK
// does change, and a few specifics could not be confirmed from docs
// alone (marked TODO below). Before this goes live: `npm install
// @supabase/supabase-js @circle-fin/developer-controlled-wallets`, get a
// sandbox API key + entity secret from the Circle console, create ONE
// wallet set (one-time, via the console or a throwaway script - not
// per-request), and walk through each TODO against the current docs at
// https://developers.circle.com/wallets/dev-controlled - SDKs drift
// faster than any comment here can track.
//
// SAFE-BY-DEFAULT: every exported function throws a clear
// "Circle not configured" error if the CIRCLE_* env vars aren't set,
// rather than crashing the whole server at require-time. That means
// this file can be required and wired into server.js today with zero
// risk to anything currently running - it's inert until the env vars
// exist.

const crypto = require("crypto");
const supabase = require("./supabase");

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;
const CIRCLE_WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID;

// BASE-SEPOLIA (testnet) until we're ready to move real money, then
// switch to BASE via env var - no code change needed. Confirm the exact
// enum string Circle expects for mainnet Base against current docs
// before flipping this (TODO).
const CIRCLE_BLOCKCHAIN = process.env.CIRCLE_BLOCKCHAIN || "BASE-SEPOLIA";

// USDC's contract address differs per chain. Set this once we know
// which chain we're actually deploying against - there is no safe
// universal default here (TODO: fill in from Circle's docs / a block
// explorer for the chosen chain before going live).
const CIRCLE_USDC_TOKEN_ADDRESS = process.env.CIRCLE_USDC_TOKEN_ADDRESS;

function isConfigured() {
    return Boolean(CIRCLE_API_KEY && CIRCLE_ENTITY_SECRET && CIRCLE_WALLET_SET_ID);
}

function requireConfigured() {
    if (!isConfigured()) {
        throw new Error(
            "Circle is not configured yet - set CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, " +
            "and CIRCLE_WALLET_SET_ID once a Circle account/sandbox exists."
        );
    }
}

// Lazily require the SDK so a missing/not-yet-installed package doesn't
// break anything that doesn't touch crypto. TODO: confirm
// `initiateDeveloperControlledWalletsClient` is still the current export
// name against https://developers.circle.com/wallets/dev-controlled.
let _client = null;
function getClient() {
    if (_client) return _client;

    requireConfigured();

    const { initiateDeveloperControlledWalletsClient } = require("@circle-fin/developer-controlled-wallets");

    _client = initiateDeveloperControlledWalletsClient({
        apiKey: CIRCLE_API_KEY,
        entitySecret: CIRCLE_ENTITY_SECRET
    });

    return _client;
}

// Circle requires a fresh UUID v4 idempotency key on every mutating
// call so a retried request (e.g. after a network blip) can never
// double-execute. crypto.randomUUID() is available in Node 14.17+.
function newIdempotencyKey() {
    return crypto.randomUUID();
}

// Creates one Circle wallet for a user and records it in
// crypto_deposit_addresses. Idempotent from the app's side - if a row
// already exists for this username/chain/asset, returns that instead of
// creating a second wallet. This is the function
// GET /api/wallet/deposit-address calls the first time a user opens
// the wallet page.
//
// TODO: confirm `createWallets` accepts a per-wallet `metadata: [{
// refId }]` array to tag the wallet with our username - the onboarding
// guide references this but the create-wallet code sample we pulled
// didn't include it inline. If it's not supported on `createWallets`,
// fall back to storing the Circle walletId <-> username mapping only in
// our own crypto_deposit_addresses table (which this function already
// does regardless, so nothing breaks either way - refId would just be a
// second, belt-and-suspenders lookup on Circle's side).
async function getOrCreateDepositWallet(username) {
    requireConfigured();

    const existing = await supabase
        .from("crypto_deposit_addresses")
        .select("*")
        .eq("username", username)
        .eq("chain", CIRCLE_BLOCKCHAIN)
        .eq("asset", "USDC")
        .maybeSingle();

    if (existing.data) {
        return {
            address: existing.data.address,
            circleWalletId: existing.data.circle_wallet_id,
            chain: existing.data.chain,
            asset: existing.data.asset
        };
    }

    const client = getClient();

    const walletsResponse = await client.createWallets({
        accountType: "SCA",
        blockchains: [CIRCLE_BLOCKCHAIN],
        count: 1,
        walletSetId: CIRCLE_WALLET_SET_ID,
        metadata: [{ refId: username, name: "PryzePot deposit wallet - " + username }],
        idempotencyKey: newIdempotencyKey()
    });

    const wallet = walletsResponse.data && walletsResponse.data.wallets && walletsResponse.data.wallets[0];

    if (!wallet || !wallet.address) {
        throw new Error("Circle did not return a wallet address for " + username);
    }

    const insertResult = await supabase
        .from("crypto_deposit_addresses")
        .insert({
            username: username,
            chain: CIRCLE_BLOCKCHAIN,
            asset: "USDC",
            circle_wallet_id: wallet.id,
            address: wallet.address,
            created_at: Date.now()
        })
        .select()
        .single();

    if (insertResult.error) {
        // The Circle wallet now exists whether or not our insert
        // succeeded - log loudly so this doesn't silently orphan a
        // wallet nobody's DB row points at.
        console.log("CIRCLE WALLET CREATED BUT DB INSERT FAILED:", username, wallet.id, wallet.address, insertResult.error);
        throw new Error("Wallet created at Circle but could not be saved - contact support before retrying.");
    }

    return {
        address: wallet.address,
        circleWalletId: wallet.id,
        chain: CIRCLE_BLOCKCHAIN,
        asset: "USDC"
    };
}

// TODO: confirm `getWalletTokenBalance` is the current method name -
// used for admin/support "does this wallet actually hold what our
// ledger thinks it does" reconciliation, not on the hot path of any
// user-facing request.
async function getWalletBalance(circleWalletId) {
    const client = getClient();

    const response = await client.getWalletTokenBalance({ id: circleWalletId });
    return (response.data && response.data.tokenBalances) || [];
}

// Sends `amount` USDC from any PryzePot-controlled wallet to any
// destination address. Generic on purpose - crypto-wallet-routes.js
// uses this for two different jobs that are the same operation under
// the hood: (1) sweeping a just-confirmed deposit out of a user's
// individual deposit wallet into the treasury wallet, and (2) sending
// an approved withdrawal from the treasury wallet to a user's external
// address. Returns Circle's transaction id immediately - the transfer
// is async on Circle's side, so the caller records this id and finds
// out it's actually done via webhook, same pattern as deposits.
async function transferOnChain({ sourceWalletId, toAddress, amount }) {
    requireConfigured();

    if (!CIRCLE_USDC_TOKEN_ADDRESS) {
        throw new Error("CIRCLE_USDC_TOKEN_ADDRESS is not set for chain " + CIRCLE_BLOCKCHAIN);
    }

    const client = getClient();

    const response = await client.createTransaction({
        walletId: sourceWalletId,
        tokenAddress: CIRCLE_USDC_TOKEN_ADDRESS,
        destinationAddress: toAddress,
        amounts: [String(amount)],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
        idempotencyKey: newIdempotencyKey()
    });

    const transactionId = response.data && response.data.id;

    if (!transactionId) {
        throw new Error("Circle did not return a transaction id for withdrawal to " + toAddress);
    }

    return { circleTransactionId: transactionId };
}

// Polls a transaction's current state. Used both by an optional backup
// polling job and by admin tooling ("why hasn't this withdrawal
// finished") - the primary path for finding out a transfer landed
// should be the webhook, not polling.
async function getTransactionState(circleTransactionId) {
    const client = getClient();

    const response = await client.getTransaction({ id: circleTransactionId });
    const tx = response.data && response.data.transaction;

    return {
        state: tx && tx.state,
        txHash: tx && tx.txHash
    };
}

// --- Webhook signature verification -----------------------------------
//
// Circle signs every v2 notification with ECDSA_SHA_256 over the RAW
// request body and sends the signature in X-Circle-Signature (base64)
// plus a X-Circle-Key-Id header naming which public key was used.
// Verifying against a parsed-then-reserialized body will fail even for
// a legitimate webhook, because re-serializing JSON changes byte order
// - the route handler MUST pass the untouched raw bytes here, which
// means express needs raw-body middleware on this one route (see
// crypto-wallet-routes.js).
//
// TODO: confirm the exact path to fetch a public key by keyId - Circle's
// docs describe a GET against a "product-specific endpoint" using the
// keyId, authenticated with the API key, but the exact path wasn't
// pinned down here. Check
// https://developers.circle.com/api-reference/wallets/common/get-notification-signature
// and fill in CIRCLE_NOTIFICATION_KEY_URL_BASE below before relying on
// this in production - until then, treat webhook signature verification
// as UNVERIFIED and do not trust incoming notifications for anything
// balance-affecting.
const CIRCLE_NOTIFICATION_KEY_URL_BASE = process.env.CIRCLE_NOTIFICATION_KEY_URL_BASE || null;

const _publicKeyCache = new Map();

async function getNotificationPublicKey(keyId) {
    if (_publicKeyCache.has(keyId)) {
        return _publicKeyCache.get(keyId);
    }

    if (!CIRCLE_NOTIFICATION_KEY_URL_BASE) {
        throw new Error("CIRCLE_NOTIFICATION_KEY_URL_BASE not set - see TODO in circle-wallets.js");
    }

    const response = await fetch(CIRCLE_NOTIFICATION_KEY_URL_BASE + "/" + keyId, {
        headers: { Authorization: "Bearer " + CIRCLE_API_KEY }
    });

    if (!response.ok) {
        throw new Error("Failed to fetch Circle notification public key " + keyId + ": " + response.status);
    }

    const body = await response.json();
    const publicKeyBase64 = body.data && (body.data.publicKey || body.publicKey);

    if (!publicKeyBase64) {
        throw new Error("Circle public key response missing publicKey field");
    }

    const keyObject = crypto.createPublicKey({
        key: Buffer.from(publicKeyBase64, "base64"),
        format: "der",
        type: "spki"
    });

    _publicKeyCache.set(keyId, keyObject);
    return keyObject;
}

// rawBody MUST be the untouched request body bytes (a Buffer), not
// req.body after JSON parsing - see comment above.
async function verifyWebhookSignature(rawBody, signatureHeaderBase64, keyId) {
    if (!signatureHeaderBase64 || !keyId) return false;

    const publicKey = await getNotificationPublicKey(keyId);

    const verifier = crypto.createVerify("SHA256");
    verifier.update(rawBody);
    verifier.end();

    return verifier.verify(publicKey, Buffer.from(signatureHeaderBase64, "base64"));
}

module.exports = {
    isConfigured: isConfigured,
    getOrCreateDepositWallet: getOrCreateDepositWallet,
    getWalletBalance: getWalletBalance,
    transferOnChain: transferOnChain,
    getTransactionState: getTransactionState,
    verifyWebhookSignature: verifyWebhookSignature,
    CIRCLE_BLOCKCHAIN: CIRCLE_BLOCKCHAIN
};
