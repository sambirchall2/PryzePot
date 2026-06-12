const API_BASE_URL = "https://api.pryzepot.com";

const backBtn = document.getElementById("backBtn");
const roundLabel = document.getElementById("roundLabel");
const playerOneBox = document.getElementById("playerOneBox");
const playerTwoBox = document.getElementById("playerTwoBox");
const statusCard = document.getElementById("statusCard");
const openClashBtn = document.getElementById("openClashBtn");
const verifyMatchBtn = document.getElementById("verifyMatchBtn");

const currentTournamentId = localStorage.getItem("currentTournamentId");
const currentTournamentMatchId = localStorage.getItem("currentTournamentMatchId");
const username = localStorage.getItem("username");

let currentMatch = null;

if (!currentTournamentId || !currentTournamentMatchId) {
    window.location.href = "tournament-room.html";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "tournament-room.html";
    });
}

function renderTournamentMatch(match) {
    currentMatch = match;

    if (Number(match.round_number) === 1) {
        roundLabel.textContent = "Semifinal";
    } else if (Number(match.round_number) === 2) {
        roundLabel.textContent = "Final";
    } else {
        roundLabel.textContent = "Round " + match.round_number;
    }

    playerOneBox.textContent = match.player_one || "TBD";
    playerTwoBox.textContent = match.player_two || "TBD";

    statusCard.textContent = match.status || "Ready";

    if (match.status === "Completed") {
        verifyMatchBtn.textContent = "MATCH COMPLETE";
        verifyMatchBtn.disabled = true;
    }
}

function loadTournamentMatch() {
    fetch(
        API_BASE_URL +
        "/api/tournaments/" +
        currentTournamentId
    )
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (!data.success) {
            alert(data.message);
            window.location.href = "tournament-room.html";
            return;
        }

        const foundMatch = (data.matches || []).find(function (match) {
            return String(match.id) === String(currentTournamentMatchId);
        });

        if (!foundMatch) {
            alert("Tournament match not found.");
            window.location.href = "tournament-room.html";
            return;
        }

        renderTournamentMatch(foundMatch);
    })
    .catch(function (error) {
        console.log("TOURNAMENT MATCH LOAD ERROR:", error);
        alert("Could not load tournament match.");
    });
}

openClashBtn.addEventListener("click", function () {
    alert("Next step: add opponent Clash friend link here.");
});

verifyMatchBtn.addEventListener("click", function () {
    alert("Next step: tournament match verification.");
});

loadTournamentMatch();

setInterval(loadTournamentMatch, 5000);