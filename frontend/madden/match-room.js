const backBtn = document.getElementById("backBtn");
const statusBadge = document.getElementById("statusBadge");
const roomSubtitle = document.getElementById("roomSubtitle");
const entryDisplay = document.getElementById("entryDisplay");
const platformDisplay = document.getElementById("platformDisplay");
const cancelBtn = document.getElementById("cancelBtn");
const joinedPopup = document.getElementById("joinedPopup");
const joinedPopupText = document.getElementById("joinedPopupText");
const joinedPopupBtn = document.getElementById("joinedPopupBtn");

const PLATFORM_LABELS = {
    ps5_xbox: "PS5 / Xbox",
    pc: "PC"
};

const username = localStorage.getItem("username");
const matchId = localStorage.getItem("currentMatchId");

let pollTimer = null;

if (!username) {
    window.location.href = "../html/index.html";
}

if (!matchId) {
    window.location.href = "match-board.html";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "match-board.html";
    });
}

if (joinedPopupBtn) {
    joinedPopupBtn.addEventListener("click", function () {
        window.location.href = "setup-rules.html";
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
        apiFetch("/api/matches/" + matchId + "/cancel", {
            method: "POST",
            body: JSON.stringify({})
        })
            .then(function (data) {
                alert(data.message);
                window.location.href = "match-board.html";
            })
            .catch(function (error) {
                console.log("CANCEL MATCH ERROR:", error);
                alert("Could not cancel this match.");
            });
    });
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// This is the "pop up the moment they join" moment (see chat) - shown
// either right after a poll detects the opponent joining, or immediately
// on load if the creator left the room and came back after it happened.
function showJoinedPopup(match) {
    stopPolling();

    if (cancelBtn) cancelBtn.classList.add("hidden");

    statusBadge.textContent = "Match Ready";
    statusBadge.classList.remove("waiting");
    statusBadge.classList.add("ready");

    joinedPopupText.innerHTML =
        (match.opponentUsername || "A player") + " joined your match. " +
        "Set up the match rules and pick your team, then invite <strong>" +
        (match.opponentTag || match.opponentUsername) + "</strong> in Madden to start.";

    joinedPopup.classList.remove("hidden");
}

function renderWaiting(match) {
    entryDisplay.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + Number(match.entryFee || 0).toFixed(2);
    platformDisplay.textContent = PLATFORM_LABELS[match.platform] || match.platform;
}

function pollForOpponent() {
    if (pollTimer) return;

    pollTimer = setInterval(function () {
        apiFetch("/api/matches/" + matchId)
            .then(function (data) {
                if (!data.success || !data.match) return;

                if (data.match.status === "Match ready") {
                    showJoinedPopup(data.match);
                }
            })
            .catch(function (error) {
                console.log("MATCH ROOM POLL ERROR:", error);
            });
    }, 5000);
}

function init() {
    apiFetch("/api/matches/" + matchId)
        .then(function (data) {
            if (!data.success || !data.match) {
                alert(data.message || "Could not load this match.");
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

            // Setup already finished (e.g. they left the room and came
            // back later) - both roles move on to reporting the result
            // from here, same destination team-select.html's ready popup
            // uses.
            if (match.setupReadyAt) {
                window.location.href = "report-result.html";
                return;
            }

            // This room is the creator's "waiting + get notified" screen -
            // the opponent's own next step is always team-select.html,
            // reached automatically right after they join (see
            // connect-madden.js), so they don't need to sit in here too.
            if (isOpponent) {
                window.location.href = "team-select.html";
                return;
            }

            renderWaiting(match);

            if (match.status === "Waiting for opponent") {
                if (roomSubtitle) roomSubtitle.textContent = "Waiting for another player to join your match.";
                pollForOpponent();
                return;
            }

            if (match.status === "Match ready") {
                const setupDone = !!match.rulesAcknowledgedAt && !!match.creatorTeamSelection;

                if (setupDone) {
                    window.location.href = "team-select.html";
                    return;
                }

                showJoinedPopup(match);
                return;
            }

            // Completed / Cancelled / Draw / expired - nothing left to do here.
            window.location.href = "match-board.html";
        })
        .catch(function (error) {
            console.log("LOAD MATCH ERROR:", error);
            alert("Could not load this match. Make sure your backend is running.");
            window.location.href = "match-board.html";
        });
}

init();
