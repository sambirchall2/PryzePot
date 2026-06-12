const API_BASE_URL = "https://api.pryzepot.com";

const tournamentSizeDisplay = document.getElementById("tournamentSize");
const entryFeeDisplay = document.getElementById("entryFee");
const prizePoolDisplay = document.getElementById("prizePool");
const playerList = document.getElementById("playerList");

const currentTournamentId = localStorage.getItem("currentTournamentId");

if (!currentTournamentId) {
    window.location.href = "match-board.html";
}

function renderTournamentRoom(tournament, players) {
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

loadTournamentRoom();

setInterval(loadTournamentRoom, 5000);