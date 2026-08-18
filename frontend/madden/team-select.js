const backBtn = document.getElementById("backBtn");
const subtitleText = document.getElementById("subtitleText");
const teamList = document.getElementById("teamList");
const continueBtn = document.getElementById("continueBtn");
const waitingPanel = document.getElementById("waitingPanel");
const yourTeamText = document.getElementById("yourTeamText");
const waitingText = document.getElementById("waitingText");
const readyPopup = document.getElementById("readyPopup");
const readyPopupText = document.getElementById("readyPopupText");
const readyPopupCloseBtn = document.getElementById("readyPopupCloseBtn");

const MADDEN_TEAMS = [
    "Buffalo Bills", "Miami Dolphins", "New England Patriots", "New York Jets",
    "Baltimore Ravens", "Cincinnati Bengals", "Cleveland Browns", "Pittsburgh Steelers",
    "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Tennessee Titans",
    "Denver Broncos", "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers",
    "Dallas Cowboys", "New York Giants", "Philadelphia Eagles", "Washington Commanders",
    "Chicago Bears", "Detroit Lions", "Green Bay Packers", "Minnesota Vikings",
    "Atlanta Falcons", "Carolina Panthers", "New Orleans Saints", "Tampa Bay Buccaneers",
    "Arizona Cardinals", "Los Angeles Rams", "San Francisco 49ers", "Seattle Seahawks"
];

const username = localStorage.getItem("username");
const matchId = localStorage.getItem("currentMatchId");

let selectedTeam = null;
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

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function showReadyPopup(match, isCreator) {
    stopPolling();

    readyPopupText.innerHTML = isCreator
        ? "Your opponent's EA name is <strong>" + match.opponentTag + "</strong>. As the host, add them in Madden to start your match."
        : "The host's EA name is <strong>" + match.creatorTag + "</strong>. Wait for their friend request in Madden.";

    teamList.classList.add("hidden");
    continueBtn.classList.add("hidden");
    waitingPanel.classList.add("hidden");

    readyPopup.classList.remove("hidden");
}

if (readyPopupCloseBtn) {
    readyPopupCloseBtn.addEventListener("click", function () {
        // Setup being ready no longer sends both players straight to
        // reporting how the match went - it returns to match-room.html's
        // Final Check screen (team picks, EA names, staking, Begin Match)
        // and THAT page is what eventually sends them on to
        // report-result.html, once both hit Ready (see chat).
        window.location.href = "match-room.html";
    });
}

function showWaitingPanel(myTeam) {
    teamList.classList.add("hidden");
    continueBtn.classList.add("hidden");

    yourTeamText.textContent = "Your team: " + myTeam;
    waitingPanel.classList.remove("hidden");
}

function pollForReady(isCreator) {
    if (pollTimer) return;

    pollTimer = setInterval(function () {
        apiFetch("/api/matches/" + matchId)
            .then(function (data) {
                if (!data.success || !data.match) return;

                if (data.match.setupReadyAt) {
                    showReadyPopup(data.match, isCreator);
                }
            })
            .catch(function (error) {
                console.log("TEAM SELECT POLL ERROR:", error);
            });
    }, 5000);
}

function renderTeamList(takenTeam) {
    teamList.innerHTML = "";

    MADDEN_TEAMS.forEach(function (team) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "team-row";
        row.textContent = team;

        if (team === takenTeam) {
            row.classList.add("taken");
            row.disabled = true;
        } else {
            row.addEventListener("click", function () {
                selectedTeam = team;

                document.querySelectorAll(".team-row").forEach(function (item) {
                    item.classList.remove("selected");
                });

                row.classList.add("selected");

                continueBtn.disabled = false;
            });
        }

        teamList.appendChild(row);
    });

    teamList.classList.remove("hidden");
    continueBtn.classList.remove("hidden");
}

function submitTeamSelection(isCreator) {
    continueBtn.disabled = true;
    continueBtn.textContent = "SAVING...";

    apiFetch("/api/matches/" + matchId + "/team-selection", {
        method: "POST",
        body: JSON.stringify({ team: selectedTeam })
    })
        .then(function (data) {
            if (!data.success) {
                alert(data.message || "Could not save your team selection.");

                continueBtn.disabled = false;
                continueBtn.textContent = "CONFIRM TEAM";
                return;
            }

            if (data.setupReady) {
                showReadyPopup(data.match, isCreator);
                return;
            }

            showWaitingPanel(selectedTeam);
            pollForReady(isCreator);
        })
        .catch(function (error) {
            console.log("TEAM SELECTION ERROR:", error);

            alert("Could not save your team selection. Make sure your backend is running.");

            continueBtn.disabled = false;
            continueBtn.textContent = "CONFIRM TEAM";
        });
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

            // The creator lands here after acknowledging setup-rules.html -
            // if they haven't yet, send them there first (that page redirects
            // back here once done). Only applies to the creator; the joiner
            // has no rules-acknowledgment step of their own.
            if (isCreator && !match.rulesAcknowledgedAt) {
                window.location.href = "setup-rules.html";
                return;
            }

            if (subtitleText) {
                subtitleText.textContent = isCreator
                    ? "Your opponent is " + (match.opponentUsername || "your opponent") + "."
                    : "You're playing against " + match.creatorUsername + ".";
            }

            if (match.setupReadyAt) {
                showReadyPopup(match, isCreator);
                return;
            }

            const myTeam = isCreator ? match.creatorTeamSelection : match.opponentTeamSelection;
            const theirTeam = isCreator ? match.opponentTeamSelection : match.creatorTeamSelection;

            if (myTeam) {
                showWaitingPanel(myTeam);
                pollForReady(isCreator);
                return;
            }

            renderTeamList(theirTeam);

            continueBtn.addEventListener("click", function () {
                if (!selectedTeam) return;
                submitTeamSelection(isCreator);
            });
        })
        .catch(function (error) {
            console.log("LOAD MATCH ERROR:", error);
            alert("Could not load this match. Make sure your backend is running.");
            window.location.href = "match-board.html";
        });
}

init();
