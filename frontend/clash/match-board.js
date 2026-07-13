const backBtn = document.getElementById("backBtn");
const matchesContainer = document.getElementById("matchesContainer");
const tournamentsContainer = document.getElementById("tournamentsContainer");
const seasonZeroStatus = document.getElementById("seasonZeroStatus");
const seasonZeroJoinBtn = document.getElementById("seasonZeroJoinBtn");

const username = localStorage.getItem("username");
const clashPlayerTag = localStorage.getItem("clashPlayerTag");
const clashFriendLink = localStorage.getItem("clashFriendLink");

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

function getVisibleMatches(matches) {
    return matches.filter(function (match) {
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

function autoJoinPendingTournament() {
    const pendingTournamentId = localStorage.getItem("pendingTournamentId");

    if (!pendingTournamentId) return;
    if (!username || !clashPlayerTag || !clashFriendLink) return;

    localStorage.removeItem("pendingTournamentId");

    apiFetch("/api/tournaments/" + pendingTournamentId + "/join", {
        method: "POST",
        body: JSON.stringify({
            playerTag: clashPlayerTag,
            friendLink: clashFriendLink
        })
    })
    .then(function (data) {
        if (!data.success) {
            alert(data.message);
            loadTournaments();
            return;
        }

        localStorage.setItem("currentTournamentId", pendingTournamentId);
        window.location.href = "tournament-room.html";
    })
    .catch(function (error) {
        console.log("AUTO JOIN TOURNAMENT ERROR:", error);
        alert("Could not join tournament.");
    });
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
                <img class="coin-icon" src="../assets/p-coin-small.png" alt="P-Coins">${tournament.entry_fee}
            </div>

            <div class="match-mode">
                ${tournament.current_players}/${tournament.max_players} Players Joined
            </div>

            <div class="match-status">
                ${tournament.tournament_size} Player Tournament
            </div>

            <div class="match-timer">
                Prize Pool: <img class="coin-icon" src="../assets/p-coin-small.png" alt="P-Coins">${prizePool}
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

        const avatar = creatorProfile.profile_picture || "avatar1";
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
                    src="../assets/profile/${avatar}.png"
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
                <img class="coin-icon" src="../assets/p-coin-small.png" alt="P-Coins">${match.entryFee}
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
                window.location.href = "connect-clash.html";
                return;
            }

            apiFetch("/api/matches/" + matchId + "/join", {
                method: "POST",
                body: JSON.stringify({
                    playerTag: clashPlayerTag,
                    friendLink: clashFriendLink
                })
            })
            .then(function (data) {
                if (data.success === true) {
                    localStorage.setItem("currentMatchId", data.match.id);
                    window.location.href = "match-room.html";
                } else {
                    alert(data.message);
                    loadMatches();
                }
            })
            .catch(function (error) {
                console.log("JOIN ERROR:", error);
                alert("Could not join match. Make sure backend is running.");
            });
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
    apiFetch("/api/tournaments")
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
    apiFetch("/api/matches")
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