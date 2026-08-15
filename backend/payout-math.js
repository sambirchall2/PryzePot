// Pure staking payout math - no DB/network calls, so it's directly unit
// testable (see test-payout-math.js) and reusable for tournaments later
// without changes once tournament staking data exists. The rule is the
// same regardless of context: every dollar staked is a percentage-
// ownership share of the entry fee, and that percentage determines the
// payout share if the staked-on player/participant wins.

const SHARE_SUM_EPSILON = 0.005; // half a cent - guards float noise, not real drift

function roundToCent(amount) {
    return Math.round(amount * 100) / 100;
}

// Returns [{ username, amount, share }] for one match/tournament-entry's
// fee. `amount` is how much of the entry fee that person effectively
// owns; `share` is amount / entryFee.
//
// The creator's (or staked-on participant's) effective amount is entryFee
// minus everything explicitly staked by others - NOT just
// creatorStakeAmount + creatorFallbackAmount added together - so shares
// still sum to exactly entryFee even if this runs before the automatic
// fallback-resolution job has formally stamped creator_fallback_amount
// yet. Under normal timing (resolution already ran before a match can be
// played and verified) the two computations agree exactly.
//
// Throws if the shares don't sum to entryFee - this is the "fails loudly"
// guard: a silent mismatch here means someone gets paid the wrong amount
// of real money once a payment processor is connected, so it must never
// pass through unnoticed.
function calculateOwnershipShares(entryFee, creatorUsername, creatorStakeAmount, creatorFallbackAmount, stakerRecords) {
    const fee = Number(entryFee) || 0;

    if (!(fee > 0)) {
        throw new Error("calculateOwnershipShares: entryFee must be greater than 0.");
    }

    const otherStakes = (stakerRecords || [])
        .map(function (stake) {
            return { username: stake.username, amount: Number(stake.amount) || 0 };
        })
        .filter(function (stake) {
            return stake.amount > 0;
        });

    const othersTotal = otherStakes.reduce(function (sum, stake) {
        return sum + stake.amount;
    }, 0);

    const explicitCreatorPortion = (Number(creatorStakeAmount) || 0) + (Number(creatorFallbackAmount) || 0);
    const impliedRemainder = Math.max(fee - explicitCreatorPortion - othersTotal, 0);
    const creatorAmount = explicitCreatorPortion + impliedRemainder;

    const shares = otherStakes.map(function (stake) {
        return { username: stake.username, amount: stake.amount, share: stake.amount / fee };
    });

    if (creatorAmount > 0) {
        shares.push({ username: creatorUsername, amount: creatorAmount, share: creatorAmount / fee });
    }

    const totalAmount = shares.reduce(function (sum, entry) {
        return sum + entry.amount;
    }, 0);

    if (Math.abs(totalAmount - fee) > SHARE_SUM_EPSILON) {
        throw new Error(
            "calculateOwnershipShares: shares sum to " + totalAmount.toFixed(2) +
            " but entry fee is " + fee.toFixed(2) + " - ownership percentages must total exactly 100%."
        );
    }

    return shares;
}

// Returns [{ username, amount, share }] - amount is what that person is
// owed out of totalWinnings, based on their ownership share. Every
// non-creator payout is rounded to the cent; whatever rounding remainder
// that leaves (positive or negative, usually a fraction of a cent) is
// folded into the creator's payout, so the total always equals
// totalWinnings exactly rather than losing or unevenly splitting stray
// pennies across stakers.
function calculatePayoutBreakdown(entryFee, creatorUsername, creatorStakeAmount, creatorFallbackAmount, stakerRecords, totalWinnings) {
    const shares = calculateOwnershipShares(entryFee, creatorUsername, creatorStakeAmount, creatorFallbackAmount, stakerRecords);
    const winnings = Number(totalWinnings) || 0;

    const payouts = [];
    let othersTotal = 0;

    shares.forEach(function (entry) {
        if (entry.username === creatorUsername) return;

        const amount = roundToCent(entry.share * winnings);
        payouts.push({ username: entry.username, amount: amount, share: entry.share });
        othersTotal += amount;
    });

    const creatorShareEntry = shares.find(function (entry) {
        return entry.username === creatorUsername;
    });

    payouts.push({
        username: creatorUsername,
        amount: roundToCent(winnings - othersTotal),
        share: creatorShareEntry ? creatorShareEntry.share : 0
    });

    return payouts;
}

module.exports = {
    calculateOwnershipShares: calculateOwnershipShares,
    calculatePayoutBreakdown: calculatePayoutBreakdown
};
