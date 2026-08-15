const backBtn = document.getElementById("backBtn");
const matchesContainer = document.getElementById("matchesContainer");
const scheduledMatchesContainer = document.getElementById("scheduledMatchesContainer");
const tournamentsContainer = document.getElementById("tournamentsContainer");
const seasonZeroStatus = document.getElementById("seasonZeroStatus");
const seasonZeroJoinBtn = document.getElementById("seasonZeroJoinBtn");

// entry_fee (matches and tournaments) is a NUMERIC(10,2) column as of the
// staking migration - PostgREST serializes NUMERIC as a JSON string (e.g.
// "500.00") to avoid float precision loss, so every displayed amount needs
// to go through Number(...) rather than being interpolated raw.
function coinHtml(amount) {
    return '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' +
        Number(amount || 0).toFixed(2);
}

const username = localStorage.getItem("username");
const clashPlayerTag = localStorage.getItem("clashPlayerTag");
const clashFriendLink = getClashFriendLink();

const TOURNAMENT_OPEN_EXPIRATION_MINUTES = 60;

let loadedMatches = [];
const profileCache = {};

function getDefaultProfile(usernameValue) {
    return {
        username: usernameValue || "Player",
        profile_picture: "avatar1",
        profile_banner: "banner1",
        level: 1
    };
}

async function warmProfileCache(usernames) {
    const missing = [...new Set(usernames)].filter(function (usernameValue) {
        return usernameValue && !profileCache[usernameValue];
    });

    if (missing.length === 0) return;

    try {
        const data = await apiFetch("/api/users/profiles-batch", {
            method: "POST",
            body: JSON.stringify({ usernames: missing })
        });

        const profiles = data.profiles || {};

        missing.forEach(function (usernameValue) {
            profileCache[usernameValue] = profiles[usernameValue] || getDefaultProfile(usernameValue);
        });
    } catch (error) {
        console.log("BATCH PROFILE LOAD ERROR:", error);

        missing.forEach(function (usernameValue) {
            profileCache[usernameValue] = getDefaultProfile(usernameValue);
        });
    }
}

async function getUserProfile(usernameValue) {
    if (!usernameValue) {
        return getDefaultProfile("Player");
    }

    if (profileCache[usernameValue]) {
        return profileCache[usernameValue];
    }

    try {
        const data = await apiFetch("/api/users/" + usernameValue + "/profile");

        if (!data.success || !data.user) {
            profileCache[usernameValue] = getDefaultProfile(usernameValue);
            return profileCache[usernameValue];
        }

        profileCache[usernameValue] = data.user;
        return data.user;
    } catch (error) {
        console.log("PROFILE LOAD ERROR:", error);
        profileCache[usernameValue] = getDefaultProfile(usernameValue);
        return profileCache[usernameValue];
    }
}
let loadedTournaments = [];

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "online.html";
    });
}

function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return minutes + ":" + seconds.toString().padStart(2, "0");
}

function getMatchTimeLeft(match) {
    const now = Date.now();

    if (match.status === "Waiting for opponent") {
        return match.expiresAt - now;
    }

    if (match.status === "Match ready") {
        return match.verifyExpiresAt - now;
    }

    return 0;
}

function isUserInMatch(match) {
    return (
        match.creatorUsername === username ||
        match.opponentUsername === username
    );
}

function isScheduledMatch(match) {
    return match.matchType === "scheduled";
}

function getVisibleMatches(matches) {
    return matches.filter(function (match) {
        // Scheduled matches get their own section (getVisibleScheduledMatches
        // below) with a different card treatment - countdown to start
        // instead of "expires in", staking badge, Join/Stake vs View/Stake -
        // so they're explicitly excluded here rather than falling through
        // into the instant-match card template.
        if (isScheduledMatch(match)) return false;

        if (match.status === "Completed") return false;
        if (match.status === "Cancelled") return false;
        if (match.status === "Draw") return false;

        const timeLeft = getMatchTimeLeft(match);
        if (timeLeft <= 0) return false;

        if (match.status === "Waiting for opponent") return true;

        if (match.status === "Match ready" && isUserInMatch(match)) {
            return true;
        }

        return false;
    });
}

function getVisibleScheduledMatches(matches) {
    return matches.filter(function (match) {
        if (!isScheduledMatch(match)) return false;
        if (match.status === "Completed") return false;
        if (match.status === "Cancelled") return false;
        if (match.status === "Expired") return false;
        if (match.status === "Draw") return false;

        return true;
    });
}

const PENDING_TOURNAMENT_JOIN_EXPIRATION_MS = 10 * 60 * 1000;

function autoJoinPendingTournament() {
    const pendingTournamentId = localStorage.getItem("pendingTournamentId");
    const pendingTournamentSetAt = Number(localStorage.getItem("pendingTournamentSetAt") || 0);

    if (!pendingTournamentId) return;

    localStorage.removeItem("pendingTournamentId");
    localStorage.removeItem("pendingTournamentSetAt");

    const isStale = !pendingTournamentSetAt ||
        (Date.now() - pendingTournamentSetAt) > PENDING_TOURNAMENT_JOIN_EXPIRATION_MS;

    if (isStale) return;
    if (!username || !clashPlayerTag || !clashFriendLink) return;

    localStorage.setItem("pendingJoinType", "tournament");
    localStorage.setItem("pendingJoinId", pendingTournamentId);
    window.location.href = "verify-clash-join.html";
}

function renderTournaments() {
    if (!tournamentsContainer) return;

    if (!loadedTournaments.length) {
        tournamentsContainer.className = "empty-tournament-state";
        tournamentsContainer.innerHTML = "No open player tournaments yet.";
        return;
    }

    tournamentsContainer.className = "";
    tournamentsContainer.innerHTML = "";

    loadedTournaments.forEach(function (tournament) {
        const card = document.createElement("div");
        card.className = "match-card";

        const prizePool =
            Number(tournament.entry_fee) *
            Number(tournament.max_players);

        const expiresAt =
            new Date(tournament.created_at).getTime() +
            TOURNAMENT_OPEN_EXPIRATION_MINUTES * 60 * 1000;

        const timeLeft = expiresAt - Date.now();

        card.innerHTML = `
            <div class="match-game">
                Clash Royale Tournament
            </div>

            <div class="match-entry">
                ${coinHtml(tournament.entry_fee)}
            </div>

            <div class="match-mode">
                ${tournament.current_players}/${tournament.max_players} Players Joined
            </div>

            <div class="match-status">
                ${tournament.tournament_size} Player Tournament
            </div>

            <div class="match-timer">
                Prize Pool: ${coinHtml(prizePool)}
            </div>

            <div class="match-timer">
                Expires in: ${formatCountdown(timeLeft)}
            </div>

            <button
                class="join-tournament-btn"
                data-tournament-id="${tournament.id}">
                JOIN TOURNAMENT
            </button>
        `;

        tournamentsContainer.appendChild(card);
    });

    document.querySelectorAll(".join-tournament-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            if (!username) {
                window.location.href = "../html/index.html";
                return;
            }

            localStorage.setItem("pendingTournamentId", button.dataset.tournamentId);
            localStorage.setItem("pendingTournamentSetAt", Date.now().toString());
            localStorage.setItem("afterConnectRedirect", "match-board.html");

            window.location.href = "connect-clash.html";
            return;
        });
    });
}

async function renderMatches() {
    const visibleMatches = getVisibleMatches(loadedMatches);

    if (visibleMatches.length === 0) {
        matchesContainer.innerHTML = `
            <div class="empty-state">
                No open matches yet.
            </div>
        `;
        return;
    }

    matchesContainer.innerHTML = "";

    await warmProfileCache(visibleMatches.map(function (match) {
        return match.creatorUsername;
    }));

    for (const match of visibleMatches) {
        const timeLeft = getMatchTimeLeft(match);
        const creatorProfile = await getUserProfile(match.creatorUsername);

        const avatar = creatorProfile.equipped_avatar || creatorProfile.profile_picture || "avatar1";
        const level = creatorProfile.level || 1;

        const matchCard = document.createElement("div");
        matchCard.className = "match-card";

        let timerLabel = "Expires in";
        if (match.status === "Match ready") {
            timerLabel = "Verify in";
        }

        let actionButton = `
            <button class="join-btn" data-match-id="${match.id}">
                JOIN MATCH
            </button>
        `;

        if (
            match.creatorUsername === username &&
            match.status === "Waiting for opponent"
        ) {
            actionButton = `
                <button class="cancel-btn" data-match-id="${match.id}">
                    CANCEL MATCH
                </button>
            `;
        }

        if (
            match.status === "Match ready" &&
            isUserInMatch(match)
        ) {
            actionButton = `
                <button class="view-room-btn" data-match-id="${match.id}">
                    VIEW ROOM
                </button>
            `;
        }

        matchCard.innerHTML = `
            <div class="match-game">
                Clash Royale
            </div>

            <div class="match-player-row">
                <img
                    class="match-avatar"
                    src="${getCosmeticImagePath(avatar, "Avatar")}"
                    alt="${match.creatorUsername}"
                >

                <div class="match-player-info">
                    <div class="match-player-name">
                        ${match.creatorUsername}
                    </div>

                    <div class="match-player-level">
                        Level ${level}
                    </div>
                </div>
            </div>

            <div class="match-entry">
                ${coinHtml(match.entryFee)}
            </div>

            <div class="match-mode">
                1v1 Friendly Battle
            </div>

            <div class="match-status">
                ${match.status}
            </div>

            <div class="match-timer">
                ${timerLabel}: ${formatCountdown(timeLeft)}
            </div>

            ${actionButton}
        `;

        matchesContainer.appendChild(matchCard);
    }

    attachButtonListeners();
}

// Join/Stake vs View/Stake - identical logic to home.js's scheduled-match
// cards (Step 4): open opponent slot means Join/Stake, filled means
// View/Stake. Kept as a match-board-local copy rather than a shared
// import since this codebase has no shared-JS-across-pages mechanism
// beyond the plain <script> files already in ../js/.
function scheduledMatchHasOpenSlot(match) {
    return !match.opponentUsername;
}

function getScheduledMatchActionLabel(match) {
    return scheduledMatchHasOpenSlot(match) ? "JOIN/STAKE" : "VIEW/STAKE";
}

function buildScheduledMatchCard(match, creatorProfile) {
    const avatar = creatorProfile.equipped_avatar || creatorProfile.profile_picture || "avatar1";
    const level = creatorProfile.level || 1;

    // Same staking-badge treatment as the home screen (Step 4): only shown
    // while staking is enabled AND there's still room - once remainingToStake
    // hits 0 the card stays fully visible (still joinable if the opponent
    // slot is open), just without this badge, per this step's instructions.
    const stakeBadgeHtml = (match.stakingEnabled && Number(match.remainingToStake) > 0)
        ? '<div class="match-stake-badge">' +
            coinHtml(match.remainingToStake) + ' of ' + coinHtml(match.entryFee) + ' open to stake' +
          '</div>'
        : "";

    const card = document.createElement("div");
    card.className = "match-card";

    card.innerHTML = `
        <div class="match-game">
            Clash Royale
        </div>

        <div class="match-player-row">
            <img
                class="match-avatar"
                src="${getCosmeticImagePath(avatar, "Avatar")}"
                alt="${match.creatorUsername}"
            >

            <div class="match-player-info">
                <div class="match-player-name">
                    ${match.creatorUsername}
                </div>

                <div class="match-player-level">
                    Level ${level}
                </div>
            </div>
        </div>

        <div class="match-entry">
            ${coinHtml(match.entryFee)}
        </div>

        <div class="match-mode">
            ${scheduledMatchHasOpenSlot(match) ? "Open Slot" : "vs " + match.opponentUsername}
        </div>

        ${stakeBadgeHtml}

        <div class="match-timer" id="scheduled-countdown-${match.id}"></div>

        <button class="scheduled-match-btn" data-match-id="${match.id}">
            ${getScheduledMatchActionLabel(match)}
        </button>
    `;

    // The whole card navigates to the shared /match/[matchId] detail page
    // (Step 5) - that page owns the actual join/stake actions, this board
    // only lists and filters, so there's no separate modal/logic here.
    card.addEventListener("click", function () {
        window.location.href = "../html/match-detail.html?matchId=" + match.id + "&type=match";
    });

    return card;
}

// Board re-fetches and re-renders every 5s (see the setInterval below);
// each render rebuilds the container from scratch, so any countdown
// intervals started on the previous render's now-detached DOM nodes have
// to be stopped explicitly first - otherwise they'd keep ticking forever
// in the background, accumulating one more zombie interval every cycle.
let scheduledCountdownStopFns = [];

async function renderScheduledMatches() {
    if (!scheduledMatchesContainer) return;

    scheduledCountdownStopFns.forEach(function (stop) { stop(); });
    scheduledCountdownStopFns = [];

    const visibleScheduled = getVisibleScheduledMatches(loadedMatches);

    if (visibleScheduled.length === 0) {
        scheduledMatchesContainer.innerHTML = `
            <div class="empty-state">
                No scheduled matches yet.
            </div>
        `;
        return;
    }

    scheduledMatchesContainer.innerHTML = "";

    await warmProfileCache(visibleScheduled.map(function (match) {
        return match.creatorUsername;
    }));

    for (const match of visibleScheduled) {
        const creatorProfile = await getUserProfile(match.creatorUsername);
        scheduledMatchesContainer.appendChild(buildScheduledMatchCard(match, creatorProfile));
    }

    // Reuses the shared countdown component from Step 4 (js/countdown.js)
    // instead of the "expires in" MM:SS timer instant matches use above -
    // scheduled matches count down to a start time, not an offer expiry.
    visibleScheduled.forEach(function (match) {
        scheduledCountdownStopFns.push(startCountdown(
            document.getElementById("scheduled-countdown-" + match.id),
            match.scheduledTime,
            { intervalMs: 30000 }
        ));
    });
}

function attachButtonListeners() {
    document.querySelectorAll(".join-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const matchId = button.dataset.matchId;

            if (!username) {
                window.location.href = "../html/index.html";
                return;
            }

            if (!clashPlayerTag || !clashFriendLink) {
                alert("Connect your Clash Royale account and friend link first.");
                localStorage.setItem("pendingJoinType", "match");
                localStorage.setItem("pendingJoinId", matchId);
                localStorage.setItem("afterConnectRedirect", "verify-clash-join.html");
                window.location.href = "connect-clash.html";
                return;
            }

            localStorage.setItem("pendingJoinType", "match");
            localStorage.setItem("pendingJoinId", matchId);
            window.location.href = "verify-clash-join.html";
        });
    });

    document.querySelectorAll(".cancel-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const matchId = button.dataset.matchId;

            apiFetch("/api/matches/" + matchId + "/cancel", {
                method: "POST",
                body: JSON.stringify({})
            })
            .then(function (data) {
                alert(data.message);
                loadMatches();
            });
        });
    });

    document.querySelectorAll(".view-room-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const matchId = button.dataset.matchId;

            localStorage.setItem("currentMatchId", matchId);
            window.location.href = "match-room.html";
        });
    });
}

function loadTournaments() {
    apiFetch("/api/tournaments?game=" + encodeURIComponent("Clash Royale"))
        .then(function (data) {
            if (!data.success) return;

            loadedTournaments = data.tournaments;
            renderTournaments();
        })
        .catch(function (error) {
            console.log("TOURNAMENT LOAD ERROR:", error);
        });
}

function loadMatches() {
    apiFetch("/api/matches?game=" + encodeURIComponent("Clash Royale"))
        .then(function (data) {
            if (!data.success) {
                matchesContainer.innerHTML = `
                    <div class="empty-state">
                        Failed to load matches.
                    </div>
                `;
                return;
            }

            loadedMatches = data.matches;
            renderMatches();
            renderScheduledMatches();
        })
        .catch(function (error) {
            console.log("MATCH BOARD ERROR:", error);

            matchesContainer.innerHTML = `
                <div class="empty-state">
                    Could not connect to backend.
                </div>
            `;
        });
}

function loadSeasonZero() {
    if (!seasonZeroStatus && !seasonZeroJoinBtn) return;

    apiFetch("/api/tournaments/season-zero")
        .then(function (data) {
            if (!data.success) return;

            const tournament = data.tournament;

            if (seasonZeroStatus) {
                seasonZeroStatus.textContent =
                    tournament.current_players + " / " + tournament.max_players + " Players Registered";
            }

            if (seasonZeroJoinBtn) {
                if (tournament.status !== "Open") {
                    seasonZeroJoinBtn.disabled = true;
                    seasonZeroJoinBtn.textContent =
                        tournament.status === "Full" ? "FULL" : "CLOSED";
                } else {
                    seasonZeroJoinBtn.disabled = false;
                    seasonZeroJoinBtn.textContent = "JOIN";
                    seasonZeroJoinBtn.dataset.tournamentId = tournament.id;
                }
            }
        })
        .catch(function (error) {
            console.log("SEASON ZERO LOAD ERROR:", error);
        });
}

if (seasonZeroJoinBtn) {
    seasonZeroJoinBtn.addEventListener("click", function () {
        if (!username) {
            window.location.href = "../html/index.html";
            return;
        }

        const tournamentId = seasonZeroJoinBtn.dataset.tournamentId;
        if (!tournamentId) return;

        localStorage.setItem("pendingTournamentId", tournamentId);
        localStorage.setItem("pendingTournamentSetAt", Date.now().toString());
        localStorage.setItem("afterConnectRedirect", "match-board.html");

        window.location.href = "connect-clash.html";
    });
}

loadMatches();
loadTournaments();
loadSeasonZero();
autoJoinPendingTournament();

setInterval(function () {
    loadMatches();
    loadTournaments();
}, 5000);

setInterval(loadSeasonZero, 20000);