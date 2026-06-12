const backBtn = document.getElementById("backBtn");
const matchesContainer = document.getElementById("matchesContainer");
const tournamentsContainer = document.getElementById("tournamentsContainer");

const API_BASE_URL = "https://api.pryzepot.com";

const username = localStorage.getItem("username");
const clashPlayerTag = localStorage.getItem("clashPlayerTag");
const clashFriendLink = localStorage.getItem("clashFriendLink");

let loadedMatches = [];
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

        card.innerHTML = `
            <div class="match-game">
                Clash Royale Tournament
            </div>

            <div class="match-entry">
                $${tournament.entry_fee}
            </div>

            <div class="match-mode">
                ${tournament.current_players}/${tournament.max_players} Players Joined
            </div>

            <div class="match-status">
                ${tournament.tournament_size} Player Tournament
            </div>

            <div class="match-timer">
                Prize Pool: $${prizePool}
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

            if (!clashPlayerTag || !clashFriendLink) {
                alert("Connect your Clash Royale account and friend link first.");
                window.location.href = "connect-clash.html";
                return;
            }

            const tournamentId = button.dataset.tournamentId;

            fetch(API_BASE_URL + "/api/tournaments/" + tournamentId + "/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    playerTag: clashPlayerTag
                })
            })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (!data.success) {
                    alert(data.message);
                    loadTournaments();
                    return;
                }

                localStorage.setItem("currentTournamentId", tournamentId);
                window.location.href = "tournament-room.html";
            })
            .catch(function (error) {
                console.log("TOURNAMENT JOIN ERROR:", error);
                alert("Could not join tournament.");
            });
        });
    });
}

function renderMatches() {
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

    visibleMatches.forEach(function (match) {
        const timeLeft = getMatchTimeLeft(match);

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

            <div class="match-entry">
                $${match.entryFee}
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
    });

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

            fetch(API_BASE_URL + "/api/matches/" + matchId + "/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    playerTag: clashPlayerTag,
                    friendLink: clashFriendLink
                })
            })
            .then(function (response) {
                return response.json();
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

            fetch(API_BASE_URL + "/api/matches/" + matchId + "/cancel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username
                })
            })
            .then(function (response) {
                return response.json();
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
    fetch(API_BASE_URL + "/api/tournaments")
        .then(function (response) {
            return response.json();
        })
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
    fetch(API_BASE_URL + "/api/matches")
        .then(function (response) {
            return response.json();
        })
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

loadMatches();
loadTournaments();

setInterval(function () {
    renderMatches();
}, 1000);

setInterval(function () {
    loadMatches();
    loadTournaments();
}, 5000);