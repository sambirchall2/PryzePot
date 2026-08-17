const backBtn = document.getElementById("backBtn");
const statusBadge = document.getElementById("statusBadge");
const roomTitle = document.getElementById("roomTitle");
const roomSubtitle = document.getElementById("roomSubtitle");
const gameLabel = document.getElementById("gameLabel");

const entryDisplay = document.getElementById("entryDisplay");
const prizeDisplay = document.getElementById("prizeDisplay");
const timerLabel = document.getElementById("timerLabel");
const timerDisplay = document.getElementById("timerDisplay");

const playerOneCard = document.getElementById("playerOneCard");
const playerTwoCard = document.getElementById("playerTwoCard");
const instructionsCard = document.getElementById("instructionsCard");
const setupMatchBtn = document.getElementById("setupMatchBtn");

const username = localStorage.getItem("username");
const currentMatchId = localStorage.getItem("currentMatchId");

let currentMatch = null;
let lastPlayerOneUsername = null;
let lastPlayerTwoUsername = null;
let handingOff = false;

if (!username) {
    window.location.href = "../html/index.html";
}

if (!currentMatchId) {
    window.location.href = "match-board.html";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "match-board.html";
    });
}

function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return minutes + ":" + seconds.toString().padStart(2, "0");
}

function updatePlayerOne(match) {
    if (!match.creatorUsername) {
        renderMatchPlayerCard(playerOneCard, null, "PLAYER 1", true);
        return;
    }

    loadPlayerProfile(match.creatorUsername)
        .then(function (profile) {
            renderMatchPlayerCard(playerOneCard, profile, "PLAYER 1", false);
        })
        .catch(function () {
            renderMatchPlayerCard(
                playerOneCard,
                normalizePlayerProfile({
                    username: match.creatorUsername,
                    level: 1
                }),
                "PLAYER 1",
                false
            );
        });
}

function updatePlayerTwo(match) {
    if (!match.opponentUsername) {
        renderMatchPlayerCard(playerTwoCard, null, "PLAYER 2", true);
        return;
    }

    loadPlayerProfile(match.opponentUsername)
        .then(function (profile) {
            renderMatchPlayerCard(playerTwoCard, profile, "PLAYER 2", false);
        })
        .catch(function () {
            renderMatchPlayerCard(
                playerTwoCard,
                normalizePlayerProfile({
                    username: match.opponentUsername,
                    level: 1
                }),
                "PLAYER 2",
                false
            );
        });
}

function updateTimer() {
    if (!currentMatch) {
        timerDisplay.textContent = "--:--";
        return;
    }

    const now = Date.now();

    if (currentMatch.status === "Waiting for opponent") {
        timerLabel.textContent = "Time Left To Join";
        timerDisplay.textContent = formatCountdown(currentMatch.expiresAt - now);
    }

    if (currentMatch.status === "Match ready") {
        timerLabel.textContent = "Time Left To Play & Report";
        timerDisplay.textContent = formatCountdown(currentMatch.verifyExpiresAt - now);
    }

    if (currentMatch.status === "Completed") {
        timerLabel.textContent = "Match Complete";
        timerDisplay.textContent = "Verified";
    }
}

// Same handoff Clash/Chess use once a match completes (see
// frontend/clash/match-room.js) - stash the full match and let
// match-results.html render the shared winner/loser screen.
function goToResults(match) {
    if (handingOff) return;
    handingOff = true;

    localStorage.setItem("lastVerifiedMatch", JSON.stringify(match));
    window.location.href = "match-results.html";
}

// Both roles move on to setup from here: the creator sets match rules,
// the opponent picks their team. Mirrors the role split
// frontend/js/match-detail.js already uses for the scheduled-match launch.
function goToSetup() {
    if (handingOff) return;
    handingOff = true;

    const isCreator = currentMatch.creatorUsername === username;

    window.location.href = isCreator ? "setup-rules.html" : "team-select.html";
}

function updateRoomState(match) {
    if (match.editionLabel) {
        gameLabel.textContent = match.editionLabel;
    }

    entryDisplay.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + Number(match.entryFee);
    prizeDisplay.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + Number(match.entryFee) * 2;

    if (lastPlayerOneUsername !== match.creatorUsername) {
        lastPlayerOneUsername = match.creatorUsername;
        updatePlayerOne(match);
    }

    if (lastPlayerTwoUsername !== match.opponentUsername) {
        lastPlayerTwoUsername = match.opponentUsername;
        updatePlayerTwo(match);
    }

    if (match.status === "Completed") {
        goToResults(match);
        return;
    }

    // Setup already finished (e.g. they left the room and came back later) -
    // both roles move on to reporting the result from here.
    if (match.setupReadyAt) {
        window.location.href = "report-result.html";
        return;
    }

    if (match.opponentUsername) {
        statusBadge.textContent = "Opponent Found";
        statusBadge.classList.remove("waiting");
        statusBadge.classList.add("ready");

        roomTitle.textContent = "Match Ready";
        roomSubtitle.textContent =
            "Set up the match rules and pick your team, then invite " +
            (match.opponentUsername === username ? match.creatorUsername : match.opponentUsername) +
            " in Madden to start.";

        instructionsCard.classList.remove("hidden");

        setupMatchBtn.disabled = false;
        setupMatchBtn.textContent = "SET UP MATCH";
    } else {
        statusBadge.textContent = "Searching For Opponent";
        statusBadge.classList.add("waiting");
        statusBadge.classList.remove("ready");

        roomTitle.textContent = "Match Room";
        roomSubtitle.textContent = "Waiting for another player to join.";

        instructionsCard.classList.add("hidden");

        setupMatchBtn.disabled = true;
        setupMatchBtn.textContent = "WAITING FOR OPPONENT";
    }

    updateTimer();
}

function loadMatchRoom() {
    apiFetch("/api/matches/" + currentMatchId)
        .then(function (data) {
            if (!data.success) {
                alert(data.message);
                window.location.href = "match-board.html";
                return;
            }

            const match = data.match;
            const isCreator = match.creatorUsername === username;
            const isOpponent = match.opponentUsername === username;

            if (!isCreator && !isOpponent) {
                window.location.href = "match-board.html";
                return;
            }

            currentMatch = match;
            updateRoomState(currentMatch);
        })
        .catch(function (error) {
            console.log("MATCH ROOM ERROR:", error);
            alert("Could not load match room.");
        });
}

loadMatchRoom();

setInterval(loadMatchRoom, 5000);
setInterval(updateTimer, 1000);

setupMatchBtn.addEventListener("click", function () {
    if (!currentMatch || currentMatch.status !== "Match ready") {
        alert("Waiting for opponent.");
        return;
    }

    goToSetup();
});
