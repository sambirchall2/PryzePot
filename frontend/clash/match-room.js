const backBtn = document.getElementById("backBtn");
const statusBadge = document.getElementById("statusBadge");
const roomTitle = document.getElementById("roomTitle");
const roomSubtitle = document.getElementById("roomSubtitle");
const entryDisplay = document.getElementById("entryDisplay");
const timerLabel = document.getElementById("timerLabel");
const timerDisplay = document.getElementById("timerDisplay");
const playerOneTag = document.getElementById("playerOneTag");
const playerTwoTag = document.getElementById("playerTwoTag");
const playerTwoCard = document.getElementById("playerTwoCard");
const instructionsCard = document.getElementById("instructionsCard");
const openClashBtn = document.getElementById("openClashBtn");
const verifyBtn = document.getElementById("verifyBtn");

const API_BASE_URL = "http://137.184.210.72:3000";

const currentMatchId = localStorage.getItem("currentMatchId");
const currentUsername = localStorage.getItem("username");

let currentMatch = null;

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

function loadMatchRoom() {
    fetch(API_BASE_URL + "/api/matches/" + currentMatchId)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success) {
                alert(data.message);
                window.location.href = "match-board.html";
                return;
            }

            currentMatch = data.match;

            entryDisplay.textContent = "$" + currentMatch.entryFee;
            playerOneTag.textContent = currentMatch.creatorTag;

            if (currentMatch.status === "Completed") {
                localStorage.setItem("lastVerifiedMatch", JSON.stringify(currentMatch));
                window.location.href = "match-results.html";
                return;
            }

            if (currentMatch.opponentTag) {
                playerTwoTag.textContent = currentMatch.opponentTag;
                playerTwoCard.classList.remove("waiting-card");

                statusBadge.textContent = "Opponent Found";
                statusBadge.classList.remove("waiting");
                statusBadge.classList.add("ready");

                roomTitle.textContent = "Match Ready";
                roomSubtitle.textContent =
                    "Add your opponent in Clash Royale, play your 1v1 friendly battle, then return to verify.";

                instructionsCard.classList.remove("hidden");

                openClashBtn.disabled = false;
                openClashBtn.textContent = "ADD OPPONENT IN CLASH";

                verifyBtn.disabled = false;
                verifyBtn.textContent = "VERIFY MATCH";
            } else {
                playerTwoTag.textContent = "Waiting...";
                playerTwoCard.classList.add("waiting-card");

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
        alert("Opponent friend link is missing.");
        return;
    }

    window.location.href = opponentFriendLink;
});

verifyBtn.addEventListener("click", function () {
    if (!currentMatchId) {
        alert("No match selected.");
        return;
    }

    localStorage.setItem("selectedMatchId", currentMatchId);
    window.location.href = "verify-match.html";
});