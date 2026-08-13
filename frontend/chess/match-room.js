const backBtn = document.getElementById("backBtn");
const statusBadge = document.getElementById("statusBadge");
const roomTitle = document.getElementById("roomTitle");
const roomSubtitle = document.getElementById("roomSubtitle");

const entryDisplay = document.getElementById("entryDisplay");
const prizeDisplay = document.getElementById("prizeDisplay");
const timerLabel = document.getElementById("timerLabel");
const timerDisplay = document.getElementById("timerDisplay");

const playerOneCard = document.getElementById("playerOneCard");
const playerTwoCard = document.getElementById("playerTwoCard");
const instructionsCard = document.getElementById("instructionsCard");
const openClashBtn = document.getElementById("openClashBtn");
const verifyBtn = document.getElementById("verifyBtn");

const currentMatchId = localStorage.getItem("currentMatchId");
const currentUsername = localStorage.getItem("username");

let currentMatch = null;
let lastPlayerOneUsername = null;
let lastPlayerTwoUsername = null;

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
        timerLabel.textContent = "Time Left To Play & Verify";
        timerDisplay.textContent = formatCountdown(currentMatch.verifyExpiresAt - now);
    }

    if (currentMatch.status === "Completed") {
        timerLabel.textContent = "Match Complete";
        timerDisplay.textContent = "Verified";
    }
}

function updateRoomState(match) {
    entryDisplay.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + match.entryFee;
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
        localStorage.setItem("lastVerifiedMatch", JSON.stringify(match));
        window.location.href = "match-results.html";
        return;
    }

    if (match.opponentUsername) {
        statusBadge.textContent = "Opponent Found";
        statusBadge.classList.remove("waiting");
        statusBadge.classList.add("ready");

        roomTitle.textContent = "Match Ready";
        roomSubtitle.textContent =
            "Challenge your opponent on Chess.com to a 10 min Rapid game, play it, then return to verify.";

        instructionsCard.classList.remove("hidden");

        openClashBtn.disabled = false;
        openClashBtn.textContent = "CHALLENGE ON CHESS.COM";

        verifyBtn.disabled = false;
        verifyBtn.textContent = "VERIFY MATCH";
    } else {
        statusBadge.textContent = "Searching For Opponent";
        statusBadge.classList.add("waiting");
        statusBadge.classList.remove("ready");

        roomTitle.textContent = "Match Room";
        roomSubtitle.textContent = "Waiting for another player to join.";

        instructionsCard.classList.add("hidden");

        openClashBtn.disabled = true;
        openClashBtn.textContent = "WAITING FOR OPPONENT";

        verifyBtn.disabled = true;
        verifyBtn.textContent = "WAITING FOR OPPONENT";
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

            currentMatch = data.match;
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

openClashBtn.addEventListener("click", function () {
    if (!currentMatch || currentMatch.status !== "Match ready") {
        alert("Waiting for opponent.");
        return;
    }

    let opponentFriendLink = null;

    if (currentUsername === currentMatch.creatorUsername) {
        opponentFriendLink = currentMatch.opponentFriendLink;
    } else {
        opponentFriendLink = currentMatch.creatorFriendLink;
    }

    if (!opponentFriendLink) {
        alert("Opponent's Chess.com profile is missing.");
        return;
    }

    window.open(opponentFriendLink, "_blank");
});

verifyBtn.addEventListener("click", function () {
    if (!currentMatchId) {
        alert("No match selected.");
        return;
    }

    localStorage.setItem("selectedMatchId", currentMatchId);
    window.location.href = "verify-match.html";
});