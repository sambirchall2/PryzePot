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

const finalCheckCard = document.getElementById("finalCheckCard");
const myTeamDisplay = document.getElementById("myTeamDisplay");
const opponentTeamDisplay = document.getElementById("opponentTeamDisplay");
const myEaNameDisplay = document.getElementById("myEaNameDisplay");
const opponentEaNameDisplay = document.getElementById("opponentEaNameDisplay");

const offerActionStatusLine = document.getElementById("offerActionStatusLine");
const offerActionWrap = document.getElementById("offerActionWrap");
const offerActionAmountLabel = document.getElementById("offerActionAmountLabel");
const offerActionAmountInput = document.getElementById("offerActionAmountInput");
const offerActionPercentLabel = document.getElementById("offerActionPercentLabel");
const offerActionError = document.getElementById("offerActionError");
const offerActionBtn = document.getElementById("offerActionBtn");

const readyStatusLine = document.getElementById("readyStatusLine");
const readyBtn = document.getElementById("readyBtn");

function formatPercent(percent) {
    const rounded = Math.round(percent * 10) / 10;
    return (Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)) + "%";
}

function getOfferActionError(match) {
    const raw = offerActionAmountInput.value;

    if (raw === "") return "Enter a stake amount.";

    const amount = Number(raw);
    const entryFee = Number(match.entryFee);

    if (isNaN(amount)) return "Enter a valid Vault Credits amount.";
    if (amount <= 0) return "Stake must be more than 0 Vault Credits.";
    if (amount > entryFee) return "Stake can't exceed " + entryFee.toFixed(2) + " Vault Credits.";
    if (amount < entryFee * 0.25) return "You must retain at least 25% of your entry - keep at least " + (entryFee * 0.25).toFixed(2) + " Vault Credits.";

    return "";
}

function refreshOfferActionUI(match) {
    const raw = offerActionAmountInput.value;
    const error = raw === "" ? "" : getOfferActionError(match);

    offerActionError.textContent = error;
    offerActionError.classList.toggle("hidden", !error);

    const validAmount = raw !== "" && error === "";
    offerActionBtn.disabled = !validAmount;

    if (offerActionPercentLabel) {
        const displayAmount = validAmount ? Number(raw) : 0;
        const percent = Number(match.entryFee) > 0 ? (displayAmount / Number(match.entryFee)) * 100 : 0;
        offerActionPercentLabel.textContent = displayAmount.toFixed(2) + " (" + formatPercent(percent) + ")";
    }
}

function updateOfferActionSection(match) {
    const isCreator = username === match.creatorUsername;
    const canOffer = isCreator && !match.matchStartedAt;

    if (!isCreator) {
        offerActionStatusLine.textContent = "";
        offerActionWrap.classList.add("hidden");
        return;
    }

    if (match.stakingEnabled) {
        offerActionStatusLine.textContent = "You've offered action on this match - others can stake on it.";
        offerActionWrap.classList.add("hidden");
        return;
    }

    if (!canOffer) {
        offerActionStatusLine.textContent = "Staking is closed for this match.";
        offerActionWrap.classList.add("hidden");
        return;
    }

    offerActionStatusLine.textContent = "";
    offerActionWrap.classList.remove("hidden");
    offerActionAmountLabel.innerHTML =
        "How much of your <img class=\"coin-icon\" src=\"../assets/p-coin-small.png\">" +
        Number(match.entryFee).toFixed(2) + " entry are you putting up?";
    refreshOfferActionUI(match);
}

offerActionAmountInput.addEventListener("input", function () {
    if (currentMatch) refreshOfferActionUI(currentMatch);
});

offerActionBtn.addEventListener("click", function () {
    if (offerActionBtn.disabled) return;

    offerActionBtn.disabled = true;
    offerActionBtn.textContent = "OFFERING...";

    apiFetch("/api/matches/" + currentMatchId + "/offer-action", {
        method: "POST",
        body: JSON.stringify({ amount: Number(offerActionAmountInput.value) })
    })
        .then(function (data) {
            if (!data.success) {
                showToast(data.message || "Could not offer action.", "error");
                offerActionBtn.disabled = false;
                offerActionBtn.textContent = "OFFER ACTION";
                return;
            }

            showToast("Action offered - others can now stake on your entry.", "success");
            loadMatchRoom();
        })
        .catch(function (error) {
            console.log("OFFER ACTION ERROR:", error);
            showToast("Could not offer action. Make sure your backend server is running.", "error");
            offerActionBtn.disabled = false;
            offerActionBtn.textContent = "OFFER ACTION";
        });
});

readyBtn.addEventListener("click", function () {
    if (!currentMatchId) return;

    readyBtn.disabled = true;

    apiFetch("/api/matches/" + currentMatchId + "/ready", { method: "POST" })
        .then(function (data) {
            readyBtn.disabled = false;

            if (!data.success) {
                showToast(data.message || "Could not update ready status.", "error");
                return;
            }

            currentMatch = data.match;
            updateRoomState(currentMatch);
        })
        .catch(function (error) {
            console.log("READY ERROR:", error);
            readyBtn.disabled = false;
            showToast("Could not update ready status. Make sure your backend server is running.", "error");
        });
});

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

    // Once setup is finished (both players picked a team), the match
    // doesn't jump straight to reporting a result anymore - it comes back
    // here so both players can double check what team they each picked,
    // see each other's EA name, offer/see staking, and both hit Ready
    // before report-result.html unlocks (see chat - this is the "Begin
    // Match" gate, generic across every game via matchStartedAt).
    if (match.setupReadyAt) {
        if (match.matchStartedAt) {
            window.location.href = "report-result.html";
            return;
        }

        instructionsCard.classList.add("hidden");
        setupMatchBtn.classList.add("hidden");
        finalCheckCard.classList.remove("hidden");

        statusBadge.textContent = "Setup Complete";
        statusBadge.classList.remove("waiting");
        statusBadge.classList.add("ready");

        roomTitle.textContent = "Final Check";
        roomSubtitle.textContent = "Confirm setup, then both hit Ready to begin.";

        const isCreator = match.creatorUsername === username;

        myTeamDisplay.textContent = (isCreator ? match.creatorTeamSelection : match.opponentTeamSelection) || "—";
        opponentTeamDisplay.textContent = (isCreator ? match.opponentTeamSelection : match.creatorTeamSelection) || "—";
        myEaNameDisplay.textContent = (isCreator ? match.creatorTag : match.opponentTag) || "—";
        opponentEaNameDisplay.textContent = (isCreator ? match.opponentTag : match.creatorTag) || "—";

        const myReady = isCreator ? match.creatorReadyAt : match.opponentReadyAt;
        const otherReady = isCreator ? match.opponentReadyAt : match.creatorReadyAt;

        readyBtn.textContent = myReady ? "UNREADY" : "READY";
        readyStatusLine.textContent = otherReady
            ? "Your opponent is ready - waiting on you."
            : "Waiting on both players to hit ready.";

        updateOfferActionSection(match);
        updateTimer();
        return;
    }

    finalCheckCard.classList.add("hidden");

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
