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

function renderBracket(matches) {
    if (!matches || matches.length === 0) {
        bracketSection.classList.add("hidden");
        bracketList.innerHTML = "";
        return;
    }

    bracketSection.classList.remove("hidden");
    bracketList.innerHTML = "";

    matches.forEach(function (match, index) {
        const bracketCard = document.createElement("div");
        bracketCard.className = "bracket-card";

        let roundName = "Round " + match.round_number;

        if (match.round_number === 1) {
            roundName = "Semifinal " + (index + 1);
        }

        if (match.round_number === 2) {
            roundName = "Final";
        }

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
            <div class="bracket-round">${roundName}</div>

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

        bracketList.appendChild(bracketCard);
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

const finalMatch = matches.find(function (match) {
    return (
        Number(match.round_number) === 2 &&
        match.status === "Completed" &&
        match.winner_username
    );
});

if (finalMatch) {
    statusCard.textContent =
        "🏆 Tournament Champion: " + finalMatch.winner_username;
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