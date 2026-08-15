const currentUsername = localStorage.getItem("username");

if (!currentUsername) {
    window.location.href = "index.html";
}

const backBtn = document.getElementById("backBtn");
const matchContent = document.getElementById("matchContent");

const gameIcon = document.getElementById("gameIcon");
const gameName = document.getElementById("gameName");
const entryFeeDisplay = document.getElementById("entryFeeDisplay");

const playerOneCard = document.getElementById("playerOneCard");
const playerTwoCard = document.getElementById("playerTwoCard");

const countdownBadge = document.getElementById("countdownBadge");
const launchMatchBtn = document.getElementById("launchMatchBtn");

const joinSection = document.getElementById("joinSection");
const joinBtn = document.getElementById("joinBtn");

const cancelSection = document.getElementById("cancelSection");
const cancelMatchBtn = document.getElementById("cancelMatchBtn");

const stakingSection = document.getElementById("stakingSection");
const stakeTotalEntry = document.getElementById("stakeTotalEntry");
const stakeCreatorLabel = document.getElementById("stakeCreatorLabel");
const stakeCreatorAmount = document.getElementById("stakeCreatorAmount");
const stakeOthersAmount = document.getElementById("stakeOthersAmount");
const stakeYouRow = document.getElementById("stakeYouRow");
const stakeYouAmount = document.getElementById("stakeYouAmount");
const stakeRemainingAmount = document.getElementById("stakeRemainingAmount");
const stakeResolvedNote = document.getElementById("stakeResolvedNote");

const stakeFormWrap = document.getElementById("stakeFormWrap");
const detailStakeAmountLabel = document.getElementById("detailStakeAmountLabel");
const detailStakeAmountInput = document.getElementById("detailStakeAmountInput");
const detailStakePercentLabel = document.getElementById("detailStakePercentLabel");
const detailStakeError = document.getElementById("detailStakeError");
const detailStakePayoutLine = document.getElementById("detailStakePayoutLine");
const detailStakeDisclaimer = document.getElementById("detailStakeDisclaimer");
const detailStakeDisclaimerText = document.getElementById("detailStakeDisclaimerText");
const detailConfirmStakeBtn = document.getElementById("detailConfirmStakeBtn");

const payoutSection = document.getElementById("payoutSection");
const payoutHeading = document.getElementById("payoutHeading");
const payoutSummaryLine = document.getElementById("payoutSummaryLine");
const payoutList = document.getElementById("payoutList");

const GAMES = {
    clash: { name: "Clash Royale", icon: "../assets/games/clash-royale.png" },
    chess: { name: "Chess.com", icon: "../assets/games/chess-com.png" }
};

const queryParams = new URLSearchParams(window.location.search);
const matchId = queryParams.get("matchId");
const itemType = queryParams.get("type") || "match";

if (itemType !== "tournament" && !matchId) {
    window.location.href = "home.html";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

// Tournaments (Step 4's cards route here too) get a completely
// different layout (tournament-detail.js, N-slot bracket + per-player
// staking) rather than this file's 2-player model. Each script only
// ever un-hides its own container — see tournament-detail.js.
if (itemType !== "tournament" && matchContent) {
    matchContent.classList.remove("hidden");
}

function coinHtml(amount) {
    return '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' +
        Number(amount || 0).toFixed(2);
}

function formatCredits(amount) {
    return Number(amount || 0).toFixed(2);
}

function formatPercent(percent) {
    const rounded = Math.round(percent * 10) / 10;
    const text = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);

    return text + "%";
}

function shortGameKey(fullGameName) {
    return fullGameName === "Chess.com" ? "chess" : "clash";
}

function isChessMatch(match) {
    return match.game === "chess";
}

// Maps GET /api/matches/:id's response (matches table columns, camelCased
// by dbMatchToFrontend on the backend, plus a `stakes` array from
// match_stakes) onto the shape the rest of this file already renders —
// unchanged from the mock-data version this replaced, so renderHeader /
// renderPlayers / renderStakingSection / etc needed no further changes.
function normalizeRealMatch(data) {
    const match = data.match;

    return {
        id: match.id,
        type: "match",
        game: shortGameKey(match.game),
        scheduledFor: match.scheduledTime,
        entryFee: match.entryFee,
        stakingEnabled: match.stakingEnabled,
        creatorUsername: match.creatorUsername,
        opponentUsername: match.opponentUsername,
        creatorStaked: match.creatorStakeAmount || 0,
        otherStakes: (data.stakes || []).map(function (stake) {
            return { username: stake.username, amount: Number(stake.amount) };
        }),
        fallbackResolved: !!match.stakeResolvedAt,
        status: match.status,
        winnerUsername: match.winnerUsername,
        payouts: (data.payouts || []).map(function (payout) {
            return { username: payout.username, amount: Number(payout.amount), share: Number(payout.share) };
        })
    };
}

let currentMatch = null;
let countdownStopFn = null;

function loadMatch() {
    apiFetch("/api/matches/" + matchId)
        .then(function (data) {
            if (!data.success || !data.match) {
                showToast(data.message || "Could not load this match.", "error");
                window.location.href = "home.html";
                return;
            }

            currentMatch = normalizeRealMatch(data);
            renderAll();
        })
        .catch(function (error) {
            console.log("LOAD MATCH ERROR:", error);
            showToast("Could not load this match. Make sure your backend server is running.", "error");
        });
}

// ---------- Distinguishing spectator vs. participant ----------
// A viewer is a participant only if their username matches one of the
// two filled slots on the match object fetched from the backend
// (creatorUsername / opponentUsername). Everyone else — including a
// logged-in user browsing matches they have no part in — is a
// spectator. This single check drives every conditional below: the
// Join section, the "you already joined" case, and (later) any
// participant-only actions.
function isCreator(match) {
    return !!currentUsername && match.creatorUsername === currentUsername;
}

function isOpponent(match) {
    return !!currentUsername && match.opponentUsername === currentUsername;
}

function isParticipant(match) {
    return isCreator(match) || isOpponent(match);
}

function renderHeader(match) {
    const info = GAMES[match.game] || { name: match.game, icon: "" };

    if (gameIcon) {
        gameIcon.src = info.icon;
        gameIcon.alt = info.name;
    }

    if (gameName) gameName.textContent = info.name;
    if (entryFeeDisplay) entryFeeDisplay.innerHTML = coinHtml(match.entryFee);
}

function renderOpenSlotCard(container, label) {
    if (!container) return;

    container.classList.add("waiting-card");
    container.innerHTML =
        '<img class="pp-match-banner" src="../assets/profile/banner1.png" alt="Open Slot">' +
        '<div class="pp-match-overlay"></div>' +
        '<div class="pp-match-content">' +
            '<div class="pp-avatar-wrap pp-avatar-match">' +
                '<img class="pp-avatar" src="../assets/profile/avatar1.png" alt="Open Slot">' +
            '</div>' +
            '<div class="pp-match-info">' +
                '<span>' + label + '</span>' +
                '<strong>Open Slot</strong>' +
                '<p>Join</p>' +
            '</div>' +
        '</div>';
}

function renderPlayerSlot(container, username, label) {
    if (!container) return;

    if (!username) {
        renderOpenSlotCard(container, label);
        return;
    }

    loadPlayerProfile(username)
        .then(function (profile) {
            renderMatchPlayerCard(container, profile, label, false);
        })
        .catch(function () {
            renderMatchPlayerCard(
                container,
                normalizePlayerProfile({ username: username, level: 1 }),
                label,
                false
            );
        });
}

function renderPlayers(match) {
    renderPlayerSlot(playerOneCard, match.creatorUsername, "PLAYER 1");
    renderPlayerSlot(playerTwoCard, match.opponentUsername, "PLAYER 2");
}

function isMatchFull(match) {
    return !!(match.creatorUsername && match.opponentUsername);
}

// Reuses the shared countdown component (js/countdown.js, built in
// Step 4) for the ticking "Starts in Xd Xh Xm" text. Once the
// scheduled time passes and both slots are filled, this swaps to the
// same "ready to launch" pattern match-room.js already uses for
// instant 1v1 matches (status-badge.ready + a primary action button)
// instead of inventing a new one.
function refreshStatus() {
    if (!currentMatch) return;

    if (currentMatch.status === "Completed") {
        if (countdownStopFn) {
            countdownStopFn();
            countdownStopFn = null;
        }

        if (countdownBadge) {
            countdownBadge.textContent = "Match Complete";
            countdownBadge.classList.remove("waiting");
            countdownBadge.classList.add("ready");
        }

        if (launchMatchBtn) launchMatchBtn.classList.add("hidden");

        return;
    }

    const hasStarted = new Date(currentMatch.scheduledFor).getTime() <= Date.now();
    const full = isMatchFull(currentMatch);

    if (hasStarted && full) {
        if (countdownStopFn) {
            countdownStopFn();
            countdownStopFn = null;
        }

        if (countdownBadge) {
            countdownBadge.textContent = "Ready To Play";
            countdownBadge.classList.remove("waiting");
            countdownBadge.classList.add("ready");
        }

        if (launchMatchBtn) launchMatchBtn.classList.remove("hidden");
    } else {
        if (launchMatchBtn) launchMatchBtn.classList.add("hidden");

        if (countdownBadge) {
            countdownBadge.classList.remove("ready");
            countdownBadge.classList.add("waiting");
        }

        if (!countdownStopFn && countdownBadge) {
            countdownStopFn = startCountdown(countdownBadge, currentMatch.scheduledFor, { intervalMs: 30000 });
        }
    }
}

function renderJoinSection(match) {
    if (!joinSection) return;

    const canJoin = match.status !== "Completed" && !match.opponentUsername && !isCreator(match);
    joinSection.classList.toggle("hidden", !canJoin);
}

// Matches the eligibility POST /api/matches/:id/cancel actually enforces
// server-side (creator, still "Waiting for opponent") - this is just the
// UI gate, the backend re-checks both regardless.
function renderCancelSection(match) {
    if (!cancelSection) return;

    const canCancel = isCreator(match) && match.status === "Waiting for opponent";
    cancelSection.classList.toggle("hidden", !canCancel);
}

function getStakeBreakdown(match) {
    const creatorStaked = match.creatorStaked || 0;
    const otherStakes = match.otherStakes || [];

    let currentUserAmount = 0;
    let othersTotal = 0;

    otherStakes.forEach(function (stake) {
        if (stake.username === currentUsername) {
            currentUserAmount += stake.amount;
        } else {
            othersTotal += stake.amount;
        }
    });

    const totalStaked = creatorStaked + othersTotal + currentUserAmount;
    const remaining = Math.max(match.entryFee - totalStaked, 0);

    return { creatorStaked: creatorStaked, othersTotal: othersTotal, currentUserAmount: currentUserAmount, remaining: remaining };
}

function pctOfEntry(amount) {
    return currentMatch.entryFee > 0 ? (amount / currentMatch.entryFee) * 100 : 0;
}

function getDetailStakeError(remaining) {
    const raw = detailStakeAmountInput.value;

    if (raw === "") return "Enter a stake amount.";

    const amount = Number(raw);

    if (isNaN(amount)) return "Enter a valid amount.";
    if (amount <= 0) return "Stake must be more than 0.";
    if (amount > remaining) return "Stake can't exceed " + formatCredits(remaining) + " Vault Credits.";

    return "";
}

function refreshStakingForm() {
    const breakdown = getStakeBreakdown(currentMatch);
    const raw = detailStakeAmountInput.value;
    const error = raw === "" ? "" : getDetailStakeError(breakdown.remaining);

    if (detailStakeError) {
        detailStakeError.textContent = error;
        detailStakeError.classList.toggle("hidden", !error);
    }

    const validAmount = raw !== "" && error === "";
    const displayAmount = validAmount ? Number(raw) : 0;
    const percent = pctOfEntry(displayAmount);

    if (detailStakePercentLabel) {
        detailStakePercentLabel.textContent = formatCredits(displayAmount) + " = " + formatPercent(percent);
    }

    if (detailStakePayoutLine) {
        detailStakePayoutLine.textContent = validAmount
            ? "If " + currentMatch.creatorUsername + " wins, you'll receive " + formatPercent(percent) + " of the winnings."
            : "";
    }

    if (detailConfirmStakeBtn) detailConfirmStakeBtn.disabled = !validAmount;
}

function renderStakingSection() {
    if (!stakingSection) return;

    // Once the match is decided, the payout breakdown (renderPayoutSection)
    // takes over showing who owned what share and what they were owed -
    // there's no more staking to do, and the "still open to stake" framing
    // no longer makes sense.
    if (!currentMatch.stakingEnabled || currentMatch.status === "Completed") {
        stakingSection.classList.add("hidden");
        return;
    }

    stakingSection.classList.remove("hidden");

    const b = getStakeBreakdown(currentMatch);

    if (stakeCreatorLabel) {
        stakeCreatorLabel.textContent = (currentMatch.creatorUsername || "Creator") + " Staked";
    }

    stakeTotalEntry.innerHTML = coinHtml(currentMatch.entryFee);
    stakeCreatorAmount.innerHTML = coinHtml(b.creatorStaked) + " (" + formatPercent(pctOfEntry(b.creatorStaked)) + ")";
    stakeOthersAmount.innerHTML = coinHtml(b.othersTotal) + " (" + formatPercent(pctOfEntry(b.othersTotal)) + ")";
    stakeRemainingAmount.innerHTML = coinHtml(b.remaining) + " (" + formatPercent(pctOfEntry(b.remaining)) + ")";

    if (b.currentUserAmount > 0) {
        stakeYouRow.classList.remove("hidden");
        stakeYouAmount.innerHTML = coinHtml(b.currentUserAmount) + " (" + formatPercent(pctOfEntry(b.currentUserAmount)) + ")";
    } else {
        stakeYouRow.classList.add("hidden");
    }

    const alreadyStaked = b.currentUserAmount > 0;

    if (currentMatch.fallbackResolved) {
        stakeFormWrap.classList.add("hidden");
        detailStakeDisclaimer.classList.add("hidden");

        if (b.remaining > 0) {
            stakeResolvedNote.classList.remove("hidden");
            stakeResolvedNote.innerHTML =
                (currentMatch.creatorUsername || "The creator") + " covered the remaining " +
                coinHtml(b.remaining) + " after staking closed.";
        } else {
            stakeResolvedNote.classList.add("hidden");
        }

        return;
    }

    stakeResolvedNote.classList.add("hidden");

    if (b.remaining <= 0 || alreadyStaked) {
        stakeFormWrap.classList.add("hidden");
    } else {
        stakeFormWrap.classList.remove("hidden");
        detailStakeAmountLabel.innerHTML = coinHtml(b.remaining) + " still open to stake";
        detailStakeAmountInput.max = b.remaining;
        refreshStakingForm();
    }

    if (b.remaining > 0) {
        detailStakeDisclaimer.classList.remove("hidden");
        detailStakeDisclaimerText.innerHTML =
            "If the remaining " + coinHtml(b.remaining) + " isn't staked by other players before the match starts, " +
            (currentMatch.creatorUsername || "the creator") + " is responsible for covering the full entry fee.";
    } else {
        detailStakeDisclaimer.classList.add("hidden");
    }
}

// Shows the durable breakdown from Step 8 (match_payouts, computed once
// at verify-time by calculatePayoutBreakdown in backend/payout-math.js)
// once the match is decided. This is also the sanity-check surface the
// staking math step asked for: if the percentages/amounts shown here
// don't look right for a real match, that's a payout-math bug to chase
// before any real money is involved.
//
// staking_enabled matches with no payout rows means the opponent won —
// staking here only ever backs the creator's entry, so there's nothing
// to pay out on that side; stakers just lost the bet.
function renderPayoutSection() {
    if (!payoutSection) return;

    if (currentMatch.status !== "Completed" || !currentMatch.stakingEnabled) {
        payoutSection.classList.add("hidden");
        return;
    }

    payoutSection.classList.remove("hidden");

    const payouts = currentMatch.payouts || [];

    if (payouts.length === 0) {
        if (payoutHeading) payoutHeading.textContent = "Staking Result";

        if (payoutSummaryLine) {
            payoutSummaryLine.textContent =
                (currentMatch.winnerUsername || "The opponent") + " won this match — stakes backing " +
                (currentMatch.creatorUsername || "the creator") + " were not paid out.";
        }

        if (payoutList) payoutList.innerHTML = "";
        return;
    }

    if (payoutHeading) payoutHeading.textContent = "Payout Breakdown";

    if (payoutSummaryLine) {
        payoutSummaryLine.textContent =
            (currentMatch.winnerUsername || "The winner") + " won — here's how the payout split by stake share.";
    }

    if (payoutList) {
        payoutList.innerHTML = "";

        payouts.forEach(function (payout) {
            const isYou = payout.username === currentUsername;
            const row = document.createElement("div");
            row.className = "payout-row" + (isYou ? " you-row" : "");

            row.innerHTML =
                '<div class="payout-row-name">' +
                    '<strong>' + payout.username + (isYou ? " (You)" : "") + '</strong>' +
                    '<span>' + formatPercent(payout.share * 100) + ' share</span>' +
                '</div>' +
                '<div class="payout-row-amount">' + coinHtml(payout.amount) + '</div>';

            payoutList.appendChild(row);
        });
    }
}

function renderAll() {
    renderHeader(currentMatch);
    renderPlayers(currentMatch);
    renderJoinSection(currentMatch);
    renderCancelSection(currentMatch);
    renderStakingSection();
    renderPayoutSection();
    refreshStatus();
}

if (joinBtn) {
    joinBtn.addEventListener("click", function () {
        const isChess = isChessMatch(currentMatch);
        const gameFolder = isChess ? "chess" : "clash";

        const playerTag = isChess ? getChessUsername() : localStorage.getItem("clashPlayerTag");
        const friendLink = isChess ? null : getClashFriendLink();

        if (!playerTag || (!isChess && !friendLink)) {
            localStorage.setItem(
                "afterConnectRedirect",
                "../html/match-detail.html?matchId=" + matchId + "&type=match"
            );
            window.location.href = "../" + gameFolder + "/connect-" + gameFolder + ".html";
            return;
        }

        joinBtn.disabled = true;
        joinBtn.textContent = "JOINING...";

        apiFetch("/api/matches/" + matchId + "/join", {
            method: "POST",
            body: JSON.stringify({ playerTag: playerTag, friendLink: friendLink })
        })
            .then(function (data) {
                if (!data.success) {
                    showToast(data.message || "Could not join this match.", "error");

                    joinBtn.disabled = false;
                    joinBtn.textContent = "JOIN MATCH";
                    return;
                }

                showToast("You joined the match.", "success");

                loadMatch();
            })
            .catch(function (error) {
                console.log("JOIN MATCH ERROR:", error);

                showToast("Could not join this match. Make sure your backend server is running.", "error");

                joinBtn.disabled = false;
                joinBtn.textContent = "JOIN MATCH";
            });
    });
}

if (cancelMatchBtn) {
    cancelMatchBtn.addEventListener("click", function () {
        // No confirmation dialog, matching the existing Match Board cancel
        // button (match-board.js's .cancel-btn) - this app doesn't use
        // confirm() anywhere else for this action.
        cancelMatchBtn.disabled = true;
        cancelMatchBtn.textContent = "CANCELLING...";

        apiFetch("/api/matches/" + matchId + "/cancel", {
            method: "POST",
            body: JSON.stringify({})
        })
            .then(function (data) {
                if (!data.success) {
                    showToast(data.message || "Could not cancel this match.", "error");

                    cancelMatchBtn.disabled = false;
                    cancelMatchBtn.textContent = "CANCEL MATCH";
                    return;
                }

                showToast("Match cancelled — your entry fee and any stakes were refunded.", "success");

                window.location.href = "home.html";
            })
            .catch(function (error) {
                console.log("CANCEL MATCH ERROR:", error);

                showToast("Could not cancel this match. Make sure your backend server is running.", "error");

                cancelMatchBtn.disabled = false;
                cancelMatchBtn.textContent = "CANCEL MATCH";
            });
    });
}

if (launchMatchBtn) {
    launchMatchBtn.addEventListener("click", function () {
        // The button is only ever un-hidden once hasStarted && full (see
        // refreshStatus), but that's a CSS-visibility check, not a real
        // guard — re-check here so launching early is never possible even
        // if the button gets exposed some other way (devtools, a future
        // change that forgets the visibility gate, etc). The whole point
        // of scheduling is a committed start time, especially once
        // spectators can plan around watching it live.
        const hasStarted = new Date(currentMatch.scheduledFor).getTime() <= Date.now();

        if (!hasStarted || !isMatchFull(currentMatch)) {
            showToast("This match can't launch before its scheduled start time.", "error");
            return;
        }

        showToast("Launching scheduled matches is wired up in the backend step.", "success");
    });
}

if (detailStakeAmountInput) {
    detailStakeAmountInput.addEventListener("input", refreshStakingForm);
}

if (detailConfirmStakeBtn) {
    detailConfirmStakeBtn.addEventListener("click", function () {
        if (detailConfirmStakeBtn.disabled) return;

        const amount = Number(detailStakeAmountInput.value);

        detailConfirmStakeBtn.disabled = true;
        detailConfirmStakeBtn.textContent = "STAKING...";

        apiFetch("/api/matches/" + matchId + "/stakes", {
            method: "POST",
            body: JSON.stringify({ amount: amount })
        })
            .then(function (data) {
                if (!data.success) {
                    showToast(data.message || "Could not place stake.", "error");

                    detailConfirmStakeBtn.disabled = false;
                    detailConfirmStakeBtn.textContent = "CONFIRM STAKE";
                    return;
                }

                showToast("You staked " + formatCredits(amount) + " Vault Credits.", "success");

                detailStakeAmountInput.value = "";
                loadMatch();
            })
            .catch(function (error) {
                console.log("STAKE ERROR:", error);

                showToast("Could not place stake. Make sure your backend server is running.", "error");

                detailConfirmStakeBtn.disabled = false;
                detailConfirmStakeBtn.textContent = "CONFIRM STAKE";
            });
    });
}

if (itemType !== "tournament") {
    loadMatch();
    setInterval(refreshStatus, 30000);
}
