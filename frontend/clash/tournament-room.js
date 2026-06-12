const API_BASE_URL = "https://api.pryzepot.com";

const tournamentSizeDisplay = document.getElementById("tournamentSize");
const entryFeeDisplay = document.getElementById("entryFee");
const prizePoolDisplay = document.getElementById("prizePool");
const playerList = document.getElementById("playerList");
const statusCard = document.getElementById("statusCard");
const cancelTournamentBtn = document.getElementById("cancelTournamentBtn");

const currentTournamentId = localStorage.getItem("currentTournamentId");
const username = localStorage.getItem("username");

let currentTournament = null;

if (!currentTournamentId) {
    window.location.href = "match-board.html";
}

function renderTournamentRoom(tournament, players) {
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

    if (tournament.status === "Open") {
        statusCard.textContent = "Waiting for tournament to fill...";
    } else if (tournament.status === "Full") {
        statusCard.textContent = "Tournament full. Bracket coming next.";
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

            renderTournamentRoom(data.tournament, data.players);
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