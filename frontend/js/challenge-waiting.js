const challengeId = localStorage.getItem("pendingChallengeId");
const username = localStorage.getItem("username");

const waitingTitle = document.getElementById("waitingTitle");
const waitingText = document.getElementById("waitingText");
const countdownText = document.getElementById("countdownText");
const cancelWaitingBtn = document.getElementById("cancelWaitingBtn");

const challengerName = document.getElementById("challengerName");
const receiverName = document.getElementById("receiverName");
const entryFeeText = document.getElementById("entryFeeText");

if (!challengeId) {
    window.location.href = "home.html";
}

let pollInterval = null;
let countdownInterval = null;
let expiresAt = null;

function formatTime(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return minutes + ":" + String(seconds).padStart(2, "0");
}

function updateCountdown() {
    if (!expiresAt) return;

    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
        countdownText.textContent = "Expired";
        waitingTitle.textContent = "Challenge expired";
        waitingText.textContent = "Your friend did not accept in time.";
        cancelWaitingBtn.textContent = "BACK HOME";

        clearInterval(pollInterval);
        clearInterval(countdownInterval);
        localStorage.removeItem("pendingChallengeId");

        return;
    }

    countdownText.textContent = formatTime(remaining) + " remaining";
}

function handleAccepted(challenge) {
    clearInterval(pollInterval);
    clearInterval(countdownInterval);

statusIcon.className = "status-logo-wrap accepted";
    waitingTitle.textContent = "Opponent accepted!";
    waitingText.textContent = "Preparing your match...";
    countdownText.textContent = "";

    localStorage.setItem("currentMatchId", challenge.match_id);
    localStorage.removeItem("pendingChallengeId");

    setTimeout(function () {
        window.location.href =
            "../clash/connect-clash.html?friendChallenge=1&matchId=" +
            challenge.match_id;
    }, 1200);
}

function handleDeclined() {
    clearInterval(pollInterval);
    clearInterval(countdownInterval);

statusIcon.className = "status-logo-wrap declined";
    waitingTitle.textContent = "Challenge declined";
    waitingText.textContent = "Your friend declined the challenge.";
    countdownText.textContent = "";
    cancelWaitingBtn.textContent = "BACK HOME";

    localStorage.removeItem("pendingChallengeId");
}

function handleCancelled() {
    clearInterval(pollInterval);
    clearInterval(countdownInterval);

    window.location.href = "home.html";
}

function checkChallengeStatus() {
    apiFetch("/api/friends/challenge/" + challengeId)
        .then(function (data) {
            if (!data.success || !data.challenge) {
                return;
            }

            const challenge = data.challenge;

            challengerName.textContent = challenge.challenger_username || "You";
            receiverName.textContent = challenge.receiver_username || "Friend";
            entryFeeText.textContent =
                "$" + Number(challenge.entry_fee || 0).toLocaleString() + " Match";

            expiresAt = Number(challenge.created_at || Date.now()) + 5 * 60 * 1000;
            updateCountdown();

            if (challenge.status === "accepted") {
                handleAccepted(challenge);
            }

            if (challenge.status === "declined") {
                handleDeclined();
            }

            if (challenge.status === "expired") {
                updateCountdown();
            }

            if (challenge.status === "cancelled") {
                handleCancelled();
            }
        })
        .catch(function (error) {
            console.log("CHALLENGE STATUS ERROR:", error);
        });
}

function cancelChallenge() {
    if (!username) {
        window.location.href = "home.html";
        return;
    }

    cancelWaitingBtn.disabled = true;
    cancelWaitingBtn.textContent = "CANCELLING...";

    apiFetch("/api/friends/challenge/" + challengeId + "/cancel", {
        method: "POST",
        body: JSON.stringify({})
    })
        .then(function () {
            localStorage.removeItem("pendingChallengeId");
            window.location.href = "home.html";
        })
        .catch(function (error) {
            console.log("CANCEL CHALLENGE ERROR:", error);

            cancelWaitingBtn.disabled = false;
            cancelWaitingBtn.textContent = "CANCEL CHALLENGE";
        });
}

if (cancelWaitingBtn) {
    cancelWaitingBtn.addEventListener("click", function () {
        if (cancelWaitingBtn.textContent === "BACK HOME") {
            window.location.href = "home.html";
            return;
        }

        cancelChallenge();
    });
}

checkChallengeStatus();
pollInterval = setInterval(checkChallengeStatus, 2000);
countdownInterval = setInterval(updateCountdown, 1000);