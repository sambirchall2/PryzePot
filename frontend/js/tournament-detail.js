// Renders the scheduled-tournament layout on match-detail.html when
// ?type=tournament. Kept fully separate from match-detail.js — see the
// HTML comment above #matchContent for why — so this whole file is a
// single top-level guard and does nothing when the page is showing a
// 1v1/friends match instead.
//
// Everything lives inside this IIFE rather than a plain `if` block:
// match-detail.js and this file are both loaded as classic <script>
// tags sharing one global scope, and in non-strict mode a function
// declared inside a bare block still leaks out to that shared global
// scope (Annex B). Several names here — renderAll, renderHeader,
// coinHtml — also exist in match-detail.js; without a real function
// scope, this file's versions would silently overwrite match-detail.js's
// on any tournament page load.
(function () {

    const tQueryParams = new URLSearchParams(window.location.search);
    const tMatchId = tQueryParams.get("matchId");
    const tItemType = tQueryParams.get("type") || "match";

    if (tItemType !== "tournament") return;

    const tCurrentUsername = localStorage.getItem("username");

    if (!tCurrentUsername) {
        window.location.href = "index.html";
    }

    if (!tMatchId) {
        window.location.href = "home.html";
    }

    const tournamentContent = document.getElementById("tournamentContent");
    if (tournamentContent) tournamentContent.classList.remove("hidden");

    const tGameIcon = document.getElementById("tGameIcon");
    const tGameName = document.getElementById("tGameName");
    const tEntryFeeDisplay = document.getElementById("tEntryFeeDisplay");
    const tBracketSizeDisplay = document.getElementById("tBracketSizeDisplay");
    const tPoolDisplay = document.getElementById("tPoolDisplay");
    const tCountdownBadge = document.getElementById("tCountdownBadge");

    const tSlotsSummary = document.getElementById("tSlotsSummary");
    const tSlotsGrid = document.getElementById("tSlotsGrid");

    const tCancelSection = document.getElementById("tCancelSection");
    const tCancelBtn = document.getElementById("tCancelBtn");

    const tJoinSection = document.getElementById("tJoinSection");
    const tJoinStakeToggle = document.getElementById("tJoinStakeToggle");
    const tJoinStakeSection = document.getElementById("tJoinStakeSection");
    const tJoinStakeAmountLabel = document.getElementById("tJoinStakeAmountLabel");
    const tJoinStakeAmountInput = document.getElementById("tJoinStakeAmountInput");
    const tJoinStakePercentLabel = document.getElementById("tJoinStakePercentLabel");
    const tJoinStakeError = document.getElementById("tJoinStakeError");
    const tJoinBtn = document.getElementById("tJoinBtn");

    const tStakingSection = document.getElementById("tStakingSection");
    const tStakingList = document.getElementById("tStakingList");

    const tPayoutSection = document.getElementById("tPayoutSection");
    const tPayoutHeading = document.getElementById("tPayoutHeading");
    const tPayoutSummaryLine = document.getElementById("tPayoutSummaryLine");
    const tPayoutList = document.getElementById("tPayoutList");

    const GAMES = {
        clash: { name: "Clash Royale", icon: "../assets/games/clash-royale.png" },
        chess: { name: "Chess.com", icon: "../assets/games/chess-com.png" }
    };

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

    function pctOf(amount, entryFee) {
        return entryFee > 0 ? (amount / entryFee) * 100 : 0;
    }

    function shortGameKey(fullGameName) {
        return fullGameName === "Chess.com" ? "chess" : "clash";
    }

    function isChessTournament(t) {
        return t.game === "chess";
    }

    // Maps GET /api/tournaments/:id's response (tournaments/tournament_players
    // raw columns, plus tournament_stakes/tournament_payouts arrays) onto the
    // shape the rest of this file renders. players is padded with null up to
    // max_players so open slots render the same way the old mock data did.
    function normalizeRealTournament(data) {
        const t = data.tournament;
        const joinedUsernames = (data.players || []).map(function (p) { return p.username; });
        const openSlots = Math.max(Number(t.max_players || 0) - joinedUsernames.length, 0);

        const staking = {};

        (data.players || []).forEach(function (p) {
            if (!p.staking_enabled) return;

            staking[p.username] = {
                enabled: true,
                ownStake: Number(p.own_stake_amount) || 0,
                fallbackAmount: p.fallback_amount === null ? null : Number(p.fallback_amount),
                otherStakes: (data.stakes || [])
                    .filter(function (stake) { return stake.staked_username === p.username; })
                    .map(function (stake) { return { username: stake.staker_username, amount: Number(stake.amount), status: stake.status || "held" }; })
            };
        });

        return {
            id: t.id,
            type: "tournament",
            game: shortGameKey(t.game),
            scheduledFor: t.scheduled_time,
            entryFee: Number(t.entry_fee) || 0,
            bracketSize: Number(t.max_players) || 0,
            players: joinedUsernames.concat(Array(openSlots).fill(null)),
            status: t.status,
            creatorUsername: t.creator_username,
            winnerUsername: t.winner_username,
            stakeResolvedAt: t.stake_resolved_at,
            staking: staking,
            payouts: (data.payouts || []).map(function (payout) {
                return { username: payout.username, amount: Number(payout.amount), share: Number(payout.share) };
            })
        };
    }

    // Same idea as match-detail.js's checkStakeStatusTransitions - tracked
    // in memory across loadTournament() polls, not persisted. A tournament
    // can have the current user staked on by others AND staking on other
    // participants at the same time, so this tracks both directions:
    // asStaked (are you the one being staked on, and did it just release)
    // and asStaker (per staked-on participant, did your own stake just
    // resolve).
    let lastTournamentStakeNotifyState = null;

    function checkTournamentStakeStatusTransitions(t) {
        const state = { asStaked: false, asStaker: {} };

        const ownStaking = t.staking[tCurrentUsername];

        if (ownStaking) {
            const withMoney = ownStaking.otherStakes.filter(function (s) { return s.amount > 0; });
            state.asStaked = withMoney.length > 0 && withMoney.every(function (s) {
                return s.status === "released_to_creator";
            });
        }

        Object.keys(t.staking).forEach(function (stakedUsername) {
            t.staking[stakedUsername].otherStakes.forEach(function (stake) {
                if (stake.username === tCurrentUsername) {
                    state.asStaker[stakedUsername] = stake.status;
                }
            });
        });

        if (lastTournamentStakeNotifyState) {
            if (state.asStaked && !lastTournamentStakeNotifyState.asStaked) {
                showToast("Stake received.", "success");
            }

            Object.keys(state.asStaker).forEach(function (stakedUsername) {
                const prevStatus = lastTournamentStakeNotifyState.asStaker[stakedUsername];
                const newStatus = state.asStaker[stakedUsername];

                if (prevStatus === "held" && newStatus === "released_to_creator") {
                    showToast("Your stake on " + stakedUsername + " was released.", "success");
                } else if (prevStatus === "held" && newStatus === "refunded") {
                    showToast("Your stake on " + stakedUsername + " was refunded.", "success");
                }
            });
        }

        lastTournamentStakeNotifyState = state;
    }

    let currentTournament = null;
    let tCountdownStopFn = null;

    function loadTournament() {
        apiFetch("/api/tournaments/" + tMatchId)
            .then(function (data) {
                if (!data.success || !data.tournament) {
                    showToast((data && data.message) || "Could not load this tournament.", "error");
                    window.location.href = "home.html";
                    return;
                }

                currentTournament = normalizeRealTournament(data);
                renderAll();
            })
            .catch(function (error) {
                console.log("LOAD TOURNAMENT ERROR:", error);
                showToast("Could not load this tournament. Make sure your backend server is running.", "error");
            });
    }

    function isCreator(t) {
        return !!tCurrentUsername && t.creatorUsername === tCurrentUsername;
    }

    function renderHeader(t) {
        const info = GAMES[t.game] || { name: t.game, icon: "" };

        if (tGameIcon) { tGameIcon.src = info.icon; tGameIcon.alt = info.name; }
        if (tGameName) tGameName.textContent = info.name;
        if (tEntryFeeDisplay) tEntryFeeDisplay.innerHTML = coinHtml(t.entryFee);
        if (tBracketSizeDisplay) tBracketSizeDisplay.textContent = t.bracketSize + " Players";

        // Matches the pool math used everywhere else in the app
        // (tournament-room.js / match-board.js / tournament-match-room.js):
        // entryFee * bracket size, not entryFee * players joined so far.
        if (tPoolDisplay) tPoolDisplay.innerHTML = coinHtml(t.entryFee * t.bracketSize);
    }

    function refreshCountdown() {
        if (!tCountdownBadge || tCountdownStopFn) return;
        tCountdownStopFn = startCountdown(tCountdownBadge, currentTournament.scheduledFor, { intervalMs: 30000 });
    }

    function stopCountdown() {
        if (tCountdownStopFn) {
            tCountdownStopFn();
            tCountdownStopFn = null;
        }
    }

    function joinedCount(t) {
        return t.players.filter(function (p) { return !!p; }).length;
    }

    function renderSlots(t) {
        if (tSlotsSummary) {
            tSlotsSummary.textContent = joinedCount(t) + " / " + t.bracketSize + " joined";
        }

        if (!tSlotsGrid) return;

        tSlotsGrid.innerHTML = "";

        t.players.forEach(function (username) {
            if (!username) {
                const openCard = document.createElement("div");
                openCard.className = "pp-tournament-player-card open-slot-card";
                openCard.innerHTML =
                    '<div class="pp-avatar-wrap pp-avatar-tournament">' +
                        '<img class="pp-avatar" src="../assets/profile/avatar1.png" alt="Open Slot">' +
                    '</div>' +
                    '<div class="pp-tournament-player-info">' +
                        '<div class="pp-tournament-player-name">Open</div>' +
                        '<div class="pp-tournament-player-level">Join</div>' +
                    '</div>';
                tSlotsGrid.appendChild(openCard);
                return;
            }

            const slot = document.createElement("div");
            tSlotsGrid.appendChild(slot);

            loadPlayerProfile(username)
                .then(function (profile) {
                    slot.outerHTML = buildTournamentPlayerCard(profile, true);
                })
                .catch(function () {
                    slot.outerHTML = buildTournamentPlayerCard(
                        normalizePlayerProfile({ username: username, level: 1 }),
                        true
                    );
                });
        });
    }

    function canCurrentUserJoin(t) {
        const alreadyIn = t.players.indexOf(tCurrentUsername) !== -1;
        const hasOpenSlot = t.players.indexOf(null) !== -1;

        return t.status === "Open" && hasOpenSlot && !alreadyIn;
    }

    // Mirrors what POST /api/tournaments/:id/cancel actually enforces
    // server-side (creator, still "Open") - this is just the UI gate, the
    // backend re-checks both regardless.
    function renderCancelSection(t) {
        if (!tCancelSection) return;

        const canCancel = isCreator(t) && t.status === "Open";
        tCancelSection.classList.toggle("hidden", !canCancel);
    }

    function refreshJoinStakeForm() {
        const entryFee = currentTournament.entryFee;
        const raw = tJoinStakeAmountInput.value;
        let error = "";

        if (tJoinStakeToggle.checked) {
            if (raw === "") {
                error = "Enter a stake amount.";
            } else {
                const amount = Number(raw);

                if (isNaN(amount)) error = "Enter a valid amount.";
                else if (amount <= 0) error = "Stake must be more than 0.";
                else if (amount > entryFee) error = "Stake can't exceed " + formatCredits(entryFee) + " Vault Credits.";
                else if (amount < entryFee * 0.25) error = "You must retain at least 25% of your entry - keep at least " + formatCredits(entryFee * 0.25) + " Vault Credits.";
            }
        }

        tJoinStakeError.textContent = error;
        tJoinStakeError.classList.toggle("hidden", !error);

        const validAmount = !tJoinStakeToggle.checked || (raw !== "" && error === "");
        const displayAmount = (tJoinStakeToggle.checked && raw !== "" && error === "") ? Number(raw) : 0;
        const percent = pctOf(displayAmount, entryFee);

        if (tJoinStakePercentLabel) {
            tJoinStakePercentLabel.textContent = tJoinStakeToggle.checked
                ? formatCredits(displayAmount) + " = " + formatPercent(percent)
                : "";
        }

        tJoinBtn.disabled = !validAmount;
    }

    function renderJoinSection(t) {
        if (!tJoinSection) return;

        const canJoin = canCurrentUserJoin(t);
        tJoinSection.classList.toggle("hidden", !canJoin);

        if (canJoin) {
            tJoinStakeAmountLabel.innerHTML = coinHtml(t.entryFee) + " max — this becomes your own entry's stake";
            refreshJoinStakeForm();
        }
    }

    function getParticipantBreakdown(entryFee, record) {
        const ownStake = (record && record.ownStake) || 0;
        const otherStakes = (record && record.otherStakes) || [];

        let currentUserAmount = 0;
        let othersTotal = 0;
        let currentUserStatus = null;

        otherStakes.forEach(function (stake) {
            if (stake.username === tCurrentUsername) {
                currentUserAmount += stake.amount;
                currentUserStatus = stake.status;
            } else {
                othersTotal += stake.amount;
            }
        });

        const remaining = Math.max(entryFee - ownStake - othersTotal - currentUserAmount, 0);

        return {
            ownStake: ownStake,
            othersTotal: othersTotal,
            currentUserAmount: currentUserAmount,
            currentUserStatus: currentUserStatus,
            remaining: remaining
        };
    }

    function wireParticipantStakeForm(card, username, entryFee, remaining, safeId) {
        const toggleBtn = card.querySelector(".stake-toggle-btn");
        const formWrap = card.querySelector("#stakeFormWrap-" + safeId);
        const input = card.querySelector("#stakeInput-" + safeId);
        const percentLabel = card.querySelector("#stakePercent-" + safeId);
        const errorEl = card.querySelector("#stakeError-" + safeId);
        const payoutLine = card.querySelector("#stakePayout-" + safeId);
        const confirmBtn = card.querySelector("#stakeConfirm-" + safeId);

        if (toggleBtn) {
            toggleBtn.addEventListener("click", function () {
                formWrap.classList.toggle("expanded");
            });
        }

        function refresh() {
            const raw = input.value;
            let error = "";

            if (raw !== "") {
                const amount = Number(raw);

                if (isNaN(amount)) error = "Enter a valid amount.";
                else if (amount <= 0) error = "Stake must be more than 0.";
                else if (amount > remaining) error = "Stake can't exceed " + formatCredits(remaining) + " Vault Credits.";
            }

            errorEl.textContent = error;
            errorEl.classList.toggle("hidden", !error);

            const validAmount = raw !== "" && error === "";
            const displayAmount = validAmount ? Number(raw) : 0;
            const percent = pctOf(displayAmount, entryFee);

            percentLabel.textContent = formatCredits(displayAmount) + " = " + formatPercent(percent);
            payoutLine.textContent = validAmount
                ? "If " + username + " wins, you'll receive " + formatPercent(percent) + " of the winnings."
                : "";

            confirmBtn.disabled = !validAmount;
        }

        input.addEventListener("input", refresh);

        confirmBtn.addEventListener("click", function () {
            if (confirmBtn.disabled) return;

            const amount = Number(input.value);

            confirmBtn.disabled = true;
            confirmBtn.textContent = "STAKING...";

            apiFetch("/api/tournaments/" + tMatchId + "/stakes", {
                method: "POST",
                body: JSON.stringify({ stakedUsername: username, amount: amount })
            })
                .then(function (data) {
                    if (!data.success) {
                        showToast(data.message || "Could not place stake.", "error");

                        confirmBtn.disabled = false;
                        confirmBtn.textContent = "CONFIRM STAKE";
                        return;
                    }

                    showToast("You staked " + formatCredits(amount) + " Vault Credits on " + username + ".", "success");

                    loadTournament();
                })
                .catch(function (error) {
                    console.log("TOURNAMENT STAKE ERROR:", error);

                    showToast("Could not place stake. Make sure your backend server is running.", "error");

                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "CONFIRM STAKE";
                });
        });

        refresh();
    }

    function buildParticipantStakeCard(username, t) {
        const record = t.staking[username];
        const b = getParticipantBreakdown(t.entryFee, record);
        const safeId = username.replace(/[^a-zA-Z0-9]/g, "");

        const stakingClosed = !!t.stakeResolvedAt;
        const alreadyStaked = b.currentUserAmount > 0;
        const canStakeMore = !stakingClosed && b.remaining > 0 && !alreadyStaked;

        const youStatusSuffix = b.currentUserStatus === "released_to_creator" ? " — Released"
            : (b.currentUserStatus === "refunded" ? " — Refunded" : "");

        const youRowHtml = alreadyStaked
            ? '<div class="stake-breakdown-row you-row">' +
                '<span>You Staked</span>' +
                '<strong>' + coinHtml(b.currentUserAmount) + ' (' + formatPercent(pctOf(b.currentUserAmount, t.entryFee)) + ')' + youStatusSuffix + '</strong>' +
              '</div>'
            : "";

        const formHtml = canStakeMore
            ? '<div class="stake-form-wrap" id="stakeFormWrap-' + safeId + '">' +
                '<label class="stake-amount-label">' + coinHtml(b.remaining) + ' still open to stake</label>' +
                '<div class="stake-amount-row">' +
                    '<div class="stake-amount-input-wrap">' +
                        '<img class="coin-icon stake-amount-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' +
                        '<input type="number" class="stake-amount-input" id="stakeInput-' + safeId + '" min="0.01" step="0.01" placeholder="0.00" inputmode="decimal">' +
                    '</div>' +
                    '<span class="stake-percent-label" id="stakePercent-' + safeId + '"></span>' +
                '</div>' +
                '<p class="stake-error hidden" id="stakeError-' + safeId + '"></p>' +
                '<p class="stake-payout-line" id="stakePayout-' + safeId + '"></p>' +
                '<button type="button" class="main-btn" id="stakeConfirm-' + safeId + '" disabled>CONFIRM STAKE</button>' +
              '</div>'
            : "";

        const resolvedNoteHtml = stakingClosed && b.remaining > 0
            ? '<p class="stake-resolved-note">' + username + ' covered the remaining ' + coinHtml(b.remaining) + ' after staking closed.</p>'
            : "";

        const card = document.createElement("div");
        card.className = "participant-stake-card";

        card.innerHTML =
            '<div class="participant-stake-header">' +
                '<span class="participant-stake-name">' + username + '</span>' +
                (canStakeMore ? '<button type="button" class="stake-toggle-btn">Stake</button>' : '') +
            '</div>' +
            '<div class="stake-breakdown-row">' +
                '<span>' + username + ' Staked</span>' +
                '<strong>' + coinHtml(b.ownStake) + ' (' + formatPercent(pctOf(b.ownStake, t.entryFee)) + ')</strong>' +
            '</div>' +
            '<div class="stake-breakdown-row">' +
                '<span>Staked By Others</span>' +
                '<strong>' + coinHtml(b.othersTotal) + ' (' + formatPercent(pctOf(b.othersTotal, t.entryFee)) + ')</strong>' +
            '</div>' +
            youRowHtml +
            '<div class="stake-breakdown-row stake-remaining-row">' +
                '<span>Remaining Room</span>' +
                '<strong>' + coinHtml(b.remaining) + ' (' + formatPercent(pctOf(b.remaining, t.entryFee)) + ')</strong>' +
            '</div>' +
            resolvedNoteHtml +
            formHtml;

        if (canStakeMore) {
            wireParticipantStakeForm(card, username, t.entryFee, b.remaining, safeId);
        }

        return card;
    }

    function renderStakingSection(t) {
        if (!tStakingSection || !tStakingList) return;

        const stakingUsernames = Object.keys(t.staking || {}).filter(function (username) {
            return t.staking[username] && t.staking[username].enabled && t.players.indexOf(username) !== -1;
        });

        if (stakingUsernames.length === 0 || t.status === "Completed") {
            tStakingSection.classList.add("hidden");
            return;
        }

        tStakingSection.classList.remove("hidden");
        tStakingList.innerHTML = "";

        stakingUsernames.forEach(function (username) {
            tStakingList.appendChild(buildParticipantStakeCard(username, t));
        });
    }

    // payouts is only ever populated when the champion had staking enabled
    // (see recordTournamentStakingPayoutBreakdown in server.js, which
    // returns early otherwise) - an empty array here always means no
    // staking was involved in the win, so the section just stays hidden
    // rather than needing a "stakes weren't paid out" branch the way
    // match-detail.js's payout section does for the losing side of a 1v1.
    function renderPayoutSection(t) {
        if (!tPayoutSection) return;

        if (t.status !== "Completed" || t.payouts.length === 0) {
            tPayoutSection.classList.add("hidden");
            return;
        }

        tPayoutSection.classList.remove("hidden");

        if (tPayoutHeading) tPayoutHeading.textContent = "Payout Breakdown";

        if (tPayoutSummaryLine) {
            tPayoutSummaryLine.textContent =
                (t.winnerUsername || "The champion") + " won the tournament — here's how the payout split by stake share.";
        }

        if (tPayoutList) {
            tPayoutList.innerHTML = "";

            t.payouts.forEach(function (payout) {
                const isYou = payout.username === tCurrentUsername;
                const row = document.createElement("div");
                row.className = "payout-row" + (isYou ? " you-row" : "");

                row.innerHTML =
                    '<div class="payout-row-name">' +
                        '<strong>' + payout.username + (isYou ? " (You)" : "") + '</strong>' +
                        '<span>' + formatPercent(payout.share * 100) + ' share</span>' +
                    '</div>' +
                    '<div class="payout-row-amount">' + coinHtml(payout.amount) + '</div>';

                tPayoutList.appendChild(row);
            });
        }
    }

    function refreshStatus() {
        if (!currentTournament || !tCountdownBadge) return;

        if (currentTournament.status === "Completed") {
            stopCountdown();
            tCountdownBadge.textContent = "Tournament Complete";
            tCountdownBadge.classList.remove("waiting");
            tCountdownBadge.classList.add("ready");
            return;
        }

        if (currentTournament.status === "Cancelled") {
            stopCountdown();
            tCountdownBadge.textContent = "Tournament Cancelled";
            tCountdownBadge.classList.remove("ready");
            tCountdownBadge.classList.add("waiting");
            return;
        }

        const hasStarted = Number(currentTournament.scheduledFor) <= Date.now();

        if (hasStarted) {
            stopCountdown();
            tCountdownBadge.textContent = currentTournament.status === "Full" ? "Bracket Forming..." : "Entries Closed";
            tCountdownBadge.classList.remove("ready");
            tCountdownBadge.classList.add("waiting");
        } else {
            tCountdownBadge.classList.remove("ready");
            tCountdownBadge.classList.add("waiting");
            refreshCountdown();
        }
    }

    function renderAll() {
        renderHeader(currentTournament);
        renderSlots(currentTournament);
        renderCancelSection(currentTournament);
        renderJoinSection(currentTournament);
        checkTournamentStakeStatusTransitions(currentTournament);
        renderStakingSection(currentTournament);
        renderPayoutSection(currentTournament);
        refreshStatus();
    }

    if (tJoinStakeToggle) {
        tJoinStakeToggle.addEventListener("change", function () {
            tJoinStakeSection.classList.toggle("expanded", tJoinStakeToggle.checked);

            if (!tJoinStakeToggle.checked) tJoinStakeAmountInput.value = "";

            refreshJoinStakeForm();
        });
    }

    if (tJoinStakeAmountInput) {
        tJoinStakeAmountInput.addEventListener("input", refreshJoinStakeForm);
    }

    if (tJoinBtn) {
        tJoinBtn.addEventListener("click", function () {
            if (tJoinBtn.disabled) return;

            const isChess = isChessTournament(currentTournament);
            const gameFolder = isChess ? "chess" : "clash";

            const playerTag = isChess ? getChessUsername() : localStorage.getItem("clashPlayerTag");
            const friendLink = isChess ? null : getClashFriendLink();

            if (!playerTag || (!isChess && !friendLink)) {
                localStorage.setItem(
                    "afterConnectRedirect",
                    "../html/match-detail.html?matchId=" + tMatchId + "&type=tournament"
                );
                window.location.href = "../" + gameFolder + "/connect-" + gameFolder + ".html";
                return;
            }

            tJoinBtn.disabled = true;
            tJoinBtn.textContent = "JOINING...";

            const stakingEnabled = tJoinStakeToggle.checked;
            const stakeAmount = stakingEnabled ? Number(tJoinStakeAmountInput.value) : null;

            apiFetch("/api/tournaments/" + tMatchId + "/join", {
                method: "POST",
                body: JSON.stringify({
                    playerTag: playerTag,
                    friendLink: friendLink,
                    stakingEnabled: stakingEnabled,
                    stakeAmount: stakeAmount
                })
            })
                .then(function (data) {
                    if (!data.success) {
                        showToast(data.message || "Could not join this tournament.", "error");

                        tJoinBtn.disabled = false;
                        tJoinBtn.textContent = "CONFIRM & JOIN";
                        return;
                    }

                    showToast("You joined the tournament.", "success");

                    tJoinStakeToggle.checked = false;
                    tJoinStakeSection.classList.remove("expanded");
                    tJoinStakeAmountInput.value = "";

                    loadTournament();
                })
                .catch(function (error) {
                    console.log("JOIN TOURNAMENT ERROR:", error);

                    showToast("Could not join this tournament. Make sure your backend server is running.", "error");

                    tJoinBtn.disabled = false;
                    tJoinBtn.textContent = "CONFIRM & JOIN";
                });
        });
    }

    if (tCancelBtn) {
        tCancelBtn.addEventListener("click", function () {
            tCancelBtn.disabled = true;
            tCancelBtn.textContent = "CANCELLING...";

            apiFetch("/api/tournaments/" + tMatchId + "/cancel", {
                method: "POST",
                body: JSON.stringify({})
            })
                .then(function (data) {
                    if (!data.success) {
                        showToast(data.message || "Could not cancel this tournament.", "error");

                        tCancelBtn.disabled = false;
                        tCancelBtn.textContent = "CANCEL TOURNAMENT";
                        return;
                    }

                    showToast("Tournament cancelled — every joined player's entry fee, and any stakes placed, were refunded.", "success");

                    window.location.href = "home.html";
                })
                .catch(function (error) {
                    console.log("CANCEL TOURNAMENT ERROR:", error);

                    showToast("Could not cancel this tournament. Make sure your backend server is running.", "error");

                    tCancelBtn.disabled = false;
                    tCancelBtn.textContent = "CANCEL TOURNAMENT";
                });
        });
    }

    loadTournament();
    setInterval(refreshStatus, 30000);

})();
