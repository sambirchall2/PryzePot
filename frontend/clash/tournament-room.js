const API_BASE_URL = "https://api.pryzepot.com";

const tournamentSizeDisplay = document.getElementById("tournamentSize");
const entryFeeDisplay = document.getElementById("entryFee");
const prizePoolDisplay = document.getElementById("prizePool");
const playerList = document.getElementById("playerList");
const statusCard = document.getElementById("statusCard");
const cancelTournamentBtn = document.getElementById("cancelTournamentBtn");
const bracketSection = document.getElementById("bracketSection");
const bracketList = document.getElementById("bracketList");

const currentTournamentId = localStorage.getItem("currentTournamentId");
const username = localStorage.getItem("username");

let currentTournament = null;

if (!currentTournamentId) {
    window.location.href = "match-board.html";
}

function isUserInTournamentMatch(match) {
    return match.player_one === username || match.player_two === username;
}

function getRoundTitle(roundNumber, totalRounds) {
    if (roundNumber === totalRounds) return "Final";
    if (roundNumber === totalRounds - 1) return "Semifinals";
    if (roundNumber === totalRounds - 2) return "Quarterfinals";

    return "Round " + roundNumber;
}

function getTotalRounds(matches) {
    let highestRound = 1;

    matches.forEach(function (match) {
        if (Number(match.round_number) > highestRound) {
            highestRound = Number(match.round_number);
        }
    });

    return highestRound;
}

function renderBracket(matches) {
    if (!matches || matches.length === 0) {
        bracketSection.classList.add("hidden");
        bracketList.innerHTML = "";
        return;
    }

    bracketSection.classList.remove("hidden");
    bracketList.innerHTML = "";

    const totalRounds = getTotalRounds(matches);

    const matchesByRound = {};

    matches.forEach(function (match) {
        const roundNumber = Number(match.round_number);

        if (!matchesByRound[roundNumber]) {
            matchesByRound[roundNumber] = [];
        }

        matchesByRound[roundNumber].push(match);
    });

    Object.keys(matchesByRound).forEach(function (roundKey) {
        const roundNumber = Number(roundKey);
        const roundMatches = matchesByRound[roundNumber];

        const roundSection = document.createElement("div");
        roundSection.className = "bracket-round-section";

        const roundTitle = getRoundTitle(roundNumber, totalRounds);

        roundSection.innerHTML = `
            <div class="round-header">
                <span>${roundTitle}</span>
                <small>${roundMatches.length} Match${roundMatches.length === 1 ? "" : "es"}</small>
            </div>
        `;

        roundMatches.forEach(function (match, index) {
            const bracketCard = document.createElement("div");
            bracketCard.className = "bracket-card";

            let enterButton = "";
            let winnerDisplay = "";

            if (
                match.status === "Completed" &&
                match.winner_username
            ) {
                winnerDisplay = `
                    <div class="bracket-winner">
                        Winner: ${match.winner_username}
                    </div>
                `;
            }

            if (
                match.status === "Ready" &&
                isUserInTournamentMatch(match)
            ) {
                enterButton = `
                    <button
                        class="enter-tournament-match-btn"
                        data-match-id="${match.id}">
                        ENTER MATCH
                    </button>
                `;
            }

            bracketCard.innerHTML = `
                <div class="bracket-round">
                    Match ${index + 1}
                </div>

                <div class="bracket-matchup">
                    <span>${match.player_one || "TBD"}</span>
                    <strong>VS</strong>
                    <span>${match.player_two || "TBD"}</span>
                </div>

                <div class="bracket-status">
                    ${match.status}
                </div>

                ${winnerDisplay}

                ${enterButton}
            `;

            roundSection.appendChild(bracketCard);
        });

        bracketList.appendChild(roundSection);
    });

    document
        .querySelectorAll(".enter-tournament-match-btn")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                localStorage.setItem(
                    "currentTournamentMatchId",
                    button.dataset.matchId
                );

                window.location.href = "tournament-match-room.html";
            });
        });
}

function renderTournamentRoom(tournament, players, matches) {
    currentTournament = tournament;

    const tournamentSize = Number(tournament.tournament_size);
    const entryFee = Number(tournament.entry_fee);
    const prizePool = tournamentSize * entryFee;

    tournamentSizeDisplay.textContent = tournamentSize + " Players";
    entryFeeDisplay.textContent = "$" + entryFee;
    prizePoolDisplay.textContent = "$" + prizePool;

    playerList.innerHTML = "";

    for (let i = 0; i < tournamentSize; i++) {
        const div = document.createElement("div");

        if (players[i]) {
            div.className = "player-slot filled";
            div.textContent = players[i].username;
        } else {
            div.className = "player-slot";
            div.textContent = "Waiting...";
        }

        playerList.appendChild(div);
    }

    renderBracket(matches);

const championMatch = matches
    .filter(function (match) {
        return (
            match.status === "Completed" &&
            match.winner_username
        );
    })
    .sort(function (a, b) {
        return Number(b.round_number) - Number(a.round_number);
    })[0];

if (
    tournament.status === "Completed" &&
    championMatch
) {
    statusCard.textContent =
        "🏆 Tournament Champion: " +
        championMatch.winner_username;
} else if (tournament.status === "Open") {
    statusCard.textContent = "Waiting for tournament to fill...";
} else if (tournament.status === "Full") {
    statusCard.textContent = "Tournament full. Bracket is ready.";
} else if (tournament.status === "Cancelled") {
    statusCard.textContent = "Tournament cancelled.";
}

    if (
        tournament.creator_username === username &&
        tournament.status === "Open"
    ) {
        cancelTournamentBtn.classList.remove("hidden");
    } else {
        cancelTournamentBtn.classList.add("hidden");
    }
}

function loadTournamentRoom() {
    fetch(API_BASE_URL + "/api/tournaments/" + currentTournamentId)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success) {
                alert(data.message);
                window.location.href = "match-board.html";
                return;
            }

            renderTournamentRoom(
                data.tournament,
                data.players,
                data.matches || []
            );
        })
        .catch(function (error) {
            console.log("TOURNAMENT ROOM ERROR:", error);
            alert("Could not load tournament room.");
        });
}

cancelTournamentBtn.addEventListener("click", function () {
    if (!currentTournamentId || !username) {
        alert("Missing tournament information.");
        return;
    }

    const confirmed = confirm("Cancel this tournament?");

    if (!confirmed) return;

    fetch(API_BASE_URL + "/api/tournaments/" + currentTournamentId + "/cancel", {
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

        if (data.success) {
            localStorage.removeItem("currentTournamentId");
            window.location.href = "match-board.html";
        }
    })
    .catch(function (error) {
        console.log("CANCEL TOURNAMENT ERROR:", error);
        alert("Could not cancel tournament.");
    });
});

loadTournamentRoom();

setInterval(loadTournamentRoom, 5000);