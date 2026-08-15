// Plain assertion script for payout-math.js - this repo has no test
// framework/runner installed (no dev dependencies at all in package.json),
// so this matches that: run directly with `node backend/test-payout-math.js`.
// Requires the real module rather than reimplementing the math, so this
// can never silently drift from what server.js actually calls.

const { calculateOwnershipShares, calculatePayoutBreakdown } = require("./payout-math");

let failures = 0;

function assertEqual(actual, expected, label) {
    if (Math.abs(actual - expected) > 0.001) {
        failures++;
        console.log("FAIL: " + label + " - expected " + expected + ", got " + actual);
    } else {
        console.log("PASS: " + label);
    }
}

// Spec example 1: $10 entry fee, 1v1. Creator stakes $5 (50%). A staker
// puts up $1 (10%). Total winnings = entry_fee * 2 = $20, matching the
// existing 1v1 payout in server.js (`adjustBalance(winnerUsername,
// Number(completed.data.entry_fee) * 2)`).
(function example1_oneVOne() {
    const payouts = calculatePayoutBreakdown(10, "creatorA", 5, null, [{ username: "staker1", amount: 1 }], 20);

    const staker = payouts.find(function (p) { return p.username === "staker1"; });
    const creator = payouts.find(function (p) { return p.username === "creatorA"; });

    assertEqual(staker.share, 0.1, "Example 1: staker share is 10%");
    assertEqual(staker.amount, 2, "Example 1: staker owed 10% of $20");
    assertEqual(creator.amount + staker.amount, 20, "Example 1: payouts sum to total winnings");
})();

// Spec example 2: $10 entry fee, 4-player tournament, pool = entry_fee *
// max_players = $40, matching the existing tournament payout in
// server.js (`prizePool = entry_fee * max_players`). Same 10%-share
// staker is owed 10% of the $40 pool. Proves the same generic function
// works for tournaments once tournament staking data exists - nothing
// in payout-math.js is 1v1-specific.
(function example2_tournament() {
    const payouts = calculatePayoutBreakdown(10, "championA", 9, null, [{ username: "staker1", amount: 1 }], 40);

    const staker = payouts.find(function (p) { return p.username === "staker1"; });

    assertEqual(staker.share, 0.1, "Example 2: staker share is 10%");
    assertEqual(staker.amount, 4, "Example 2: staker owed 10% of $40 tournament pool");
})();

// The Step 7 automatic fallback job stamps creator_fallback_amount for
// whatever wasn't staked by start time. Confirms that amount folds into
// the creator's effective share correctly (on top of their own explicit
// stake), not just the explicit stake alone.
(function fallbackAmountFoldsIntoCreatorShare() {
    const payouts = calculatePayoutBreakdown(10, "creatorA", 3, 4, [{ username: "staker1", amount: 3 }], 20);

    const creator = payouts.find(function (p) { return p.username === "creatorA"; });
    const staker = payouts.find(function (p) { return p.username === "staker1"; });

    assertEqual(creator.share, 0.7, "Fallback test: creator effective share includes fallback (3 + 4 = 70%)");
    assertEqual(staker.amount, 6, "Fallback test: staker owed 30% of $20");
})();

// Rounding: a 1/3 share against $10 winnings doesn't divide evenly into
// cents. The leftover fraction of a cent must land on the creator's
// payout so the total still equals the exact winnings, not get lost or
// split unevenly across stakers.
(function roundingRemainderGoesToCreator() {
    const payouts = calculatePayoutBreakdown(3, "creatorA", 2, null, [{ username: "staker1", amount: 1 }], 10);

    const staker = payouts.find(function (p) { return p.username === "staker1"; });
    const creator = payouts.find(function (p) { return p.username === "creatorA"; });

    assertEqual(staker.amount, 3.33, "Rounding test: staker gets the rounded cent amount");
    assertEqual(staker.amount + creator.amount, 10, "Rounding test: total still equals exact winnings to the cent");
})();

// The loud-failure guard: if stakes were ever over-subscribed (the
// application-level cap in POST /api/matches/:id/stakes failing, a bug
// elsewhere, bad data, etc.), this must throw instead of silently
// computing payouts that don't add up to the real money on the table.
(function overSubscribedSharesThrow() {
    let threw = false;

    try {
        calculateOwnershipShares(10, "creatorA", 8, null, [{ username: "staker1", amount: 5 }]);
    } catch (error) {
        threw = true;
    }

    if (threw) {
        console.log("PASS: over-subscribed shares (>100%) throw instead of silently mispaying");
    } else {
        failures++;
        console.log("FAIL: over-subscribed shares did not throw");
    }
})();

if (failures === 0) {
    console.log("\nAll payout math tests passed.");
    process.exit(0);
} else {
    console.log("\n" + failures + " payout math test(s) FAILED.");
    process.exit(1);
}
