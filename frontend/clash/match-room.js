const backBtn = document.getElementById("backBtn");
const statusBadge = document.getElementById("statusBadge");
const roomTitle = document.getElementById("roomTitle");
const roomSubtitle = document.getElementById("roomSubtitle");

const entryDisplay = document.getElementById("entryDisplay");
const prizeDisplay = document.getElementById("prizeDisplay");
const timerLabel = document.getElementById("timerLabel");
const timerDisplay = document.getElementById("timerDisplay");

const playerOneBanner = document.getElementById("playerOneBanner");
const playerOneAvatar = document.getElementById("playerOneAvatar");
const playerOneName = document.getElementById("playerOneName");
const playerOneLevel = document.getElementById("playerOneLevel");

const playerTwoCard = document.getElementById("playerTwoCard");
const playerTwoBanner = document.getElementById("playerTwoBanner");
const playerTwoAvatar = document.getElementById("playerTwoAvatar");
const playerTwoName = document.getElementById("playerTwoName");
const playerTwoLevel = document.getElementById("playerTwoLevel");

const instructionsCard = document.getElementById("instructionsCard");
const openClashBtn = document.getElementById("openClashBtn");
const verifyBtn = document.getElementById("verifyBtn");

const API_BASE_URL = "https://api.pryzepot.com";

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

function getProfileImage(profile, type) {
    if (!profile) {
        return type === "banner" ? "banner1" : "avatar1";
    }

    if (type === "banner") {
        return profile.profile_banner || "banner1";
    }

    return profile.profile_picture || "avatar1";
}

function getProfileLevel(profile) {
    if (!profile || !profile.level) {
        return 1;
    }

    return profile.level;
}

function updatePlayerOne(match) {
    const profile = match.creatorProfile;

    playerOneName.textContent = match.creatorUsername || "Player 1";
    playerOneLevel.textContent = "Level " + getProfileLevel(profile);
    playerOneAvatar.src = "../assets/profile/" + getProfileImage(profile, "avatar") + ".png";
    playerOneBanner.src = "../assets/profile/" + getProfileImage(profile, "banner") + ".png";
}

function updatePlayerTwo(match) {
    if (!match.opponentUsername) {
        playerTwoName.textContent = "Waiting...";
        playerTwoLevel.textContent = "Waiting";
        playerTwoAvatar.src = "../assets/profile/avatar1.png";
        playerTwoBanner.src = "../assets/profile/banner1.png";
        playerTwoCard.classList.add("waiting-card");
        return;
    }

    const profile = match.opponentProfile;

    playerTwoName.textContent = match.opponentUsername || "Player 2";
    playerTwoLevel.textContent = "Level " + getProfileLevel(profile);
    playerTwoAvatar.src = "../assets/profile/" + getProfileImage(profile, "avatar") + ".png";
    playerTwoBanner.src = "../assets/profile/" + getProfileImage(profile, "banner") + ".png";
    playerTwoCard.classList.remove("waiting-card");
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
    entryDisplay.textContent = "$" + match.entryFee;
    prizeDisplay.textContent = "$" + Number(match.entryFee) * 2;

    updatePlayerOne(match);
    updatePlayerTwo(match);

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
            "Add your opponent in Clash Royale, play your 1v1 friendly battle, then return to verify.";

        instructionsCard.classList.remove("hidden");

        openClashBtn.disabled = false;
        openClashBtn.textContent = "ADD OPPONENT IN CLASH";

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
        alert("Opponent friend link is missing.");
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