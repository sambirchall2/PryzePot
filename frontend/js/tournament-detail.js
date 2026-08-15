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
// coinHtml, persistOverride — also exist in match-detail.js; without
// a real function scope, this file's versions would silently
// overwrite match-detail.js's on any tournament page load.
(function () {

    const tQueryParams = new URLSearchParams(window.location.search);
    const tMatchId = tQueryParams.get("matchId") || "st_open_clash";
    const tItemType = tQueryParams.get("type") || "match";

    if (tItemType !== "tournament") return;

    const tCurrentUsername = localStorage.getItem("username");

    if (!tCurrentUsername) {
        window.location.href = "index.html";
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

    // Placeholder scenarios: open slots + joinable (creator is the
    // logged-in user, so the participant view is directly reachable),
    // fully filled with no staking anywhere, and fully filled with
    // several participants staking at different fill levels — until
    // the scheduled-tournament backend exists.
    const MOCK_TOURNAMENTS = {
        st_open_clash: function () {
            return {
                id: "st_open_clash", type: "tournament", game: "clash",
                scheduledFor: new Date(Date.now() + 24 * 3600000).toISOString(),
                entryFee: 250, bracketSize: 8,
                players: [tCurrentUsername, "RivalRook", "KnightMoves", null, null, null, null, null],
                staking: {
                    [tCurrentUsername]: { enabled: true, ownStake: 100, otherStakes: [{ username: "SpectatorFan", amount: 60 }] }
                }
            };
        },
        st_full_chess_nostake: function () {
            return {
                id: "st_full_chess_nostake", type: "tournament", game: "chess",
                scheduledFor: new Date(Date.now() + 26 * 3600000).toISOString(),
                entryFee: 500, bracketSize: 4,
                players: ["PixelPrince", "CrownBreaker", "EndgameEnjoyer", "RookRider"],
                staking: {}
            };
        },
        st_full_clash_stake: function () {
            return {
                id: "st_full_clash_stake", type: "tournament", game: "clash",
                scheduledFor: new Date(Date.now() + 70 * 3600000).toISOString(),
                entryFee: 1000, bracketSize: 8,
                players: [
                    "IceQueenBex", "FrostByte", "ShadowByte", "KnightRider",
                    "PawnStorm", "RookRider", "BishopBlitz", "QueenGambit"
                ],
                staking: {
                    IceQueenBex: { enabled: true, ownStake: 400, otherStakes: [{ username: "SpectatorFan", amount: 600 }] },
                    FrostByte: { enabled: true, ownStake: 200, otherStakes: [{ username: "AnotherFan", amount: 100 }] }
                }
            };
        }
    };
    function getBaseMockTournament(id) {
        const factory = MOCK_TOURNAMENTS[id] || MOCK_TOURNAMENTS.st_open_clash;
        return factory();
    }

    function getOverridesKey(id) {
        return "scheduledTournamentOverrides_" + id;
    }

    function loadOverrides(id) {
        try {
            return JSON.parse(localStorage.getItem(getOverridesKey(id))) || {};
        } catch (error) {
            return {};
        }
    }

    function persistOverride(patch) {
        const merged = Object.assign({}, loadOverrides(tMatchId), patch);
        localStorage.setItem(getOverridesKey(tMatchId), JSON.stringify(merged));
    }

    function getEffectiveTournament(id) {
        return Object.assign({}, getBaseMockTournament(id), loadOverrides(id));
    }

    let currentTournament = getEffectiveTournament(tMatchId);
    let tCountdownStopFn = null;

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

        return hasOpenSlot && !alreadyIn;
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

        otherStakes.forEach(function (stake) {
            if (stake.username === tCurrentUsername) currentUserAmount += stake.amount;
            else othersTotal += stake.amount;
        });

        const remaining = Math.max(entryFee - ownStake - othersTotal - currentUserAmount, 0);

        return { ownStake: ownStake, othersTotal: othersTotal, currentUserAmount: currentUserAmount, remaining: remaining };
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
            const record = currentTournament.staking[username] || { enabled: true, ownStake: 0, otherStakes: [] };
            const newStakes = (record.otherStakes || []).concat([{ username: tCurrentUsername, amount: amount }]);

            const newStaking = Object.assign({}, currentTournament.staking);
            newStaking[username] = Object.assign({}, record, { otherStakes: newStakes });

            currentTournament.staking = newStaking;
            persistOverride({ staking: newStaking });

            showToast("You staked " + formatCredits(amount) + " Vault Credits on " + username + ".", "success");

            renderStakingSection(currentTournament);
        });

        refresh();
    }

    function buildParticipantStakeCard(username, t) {
        const record = t.staking[username];
        const b = getParticipantBreakdown(t.entryFee, record);
        const safeId = username.replace(/[^a-zA-Z0-9]/g, "");

        const alreadyStaked = b.currentUserAmount > 0;
        const canStakeMore = b.remaining > 0 && !alreadyStaked;

        const youRowHtml = alreadyStaked
            ? '<div class="stake-breakdown-row you-row">' +
                '<span>You Staked</span>' +
                '<strong>' + coinHtml(b.currentUserAmount) + ' (' + formatPercent(pctOf(b.currentUserAmount, t.entryFee)) + ')</strong>' +
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

        if (stakingUsernames.length === 0) {
            tStakingSection.classList.add("hidden");
            return;
        }

        tStakingSection.classList.remove("hidden");
        tStakingList.innerHTML = "";

        stakingUsernames.forEach(function (username) {
            tStakingList.appendChild(buildParticipantStakeCard(username, t));
        });
    }

    function renderAll() {
        renderHeader(currentTournament);
        renderSlots(currentTournament);
        renderJoinSection(currentTournament);
        renderStakingSection(currentTournament);
        refreshCountdown();
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

            const players = currentTournament.players.slice();
            const openIndex = players.indexOf(null);

            if (openIndex === -1) return;

            players[openIndex] = tCurrentUsername;

            const staking = Object.assign({}, currentTournament.staking);

            if (tJoinStakeToggle.checked) {
                staking[tCurrentUsername] = {
                    enabled: true,
                    ownStake: Number(tJoinStakeAmountInput.value),
                    otherStakes: []
                };
            }

            currentTournament.players = players;
            currentTournament.staking = staking;

            persistOverride({ players: players, staking: staking });

            showToast("You joined the tournament.", "success");

            tJoinStakeToggle.checked = false;
            tJoinStakeSection.classList.remove("expanded");
            tJoinStakeAmountInput.value = "";

            renderAll();
        });
    }

    renderAll();

})();
