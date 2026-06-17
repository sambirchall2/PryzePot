const API_BASE_URL = "https://api.pryzepot.com";

const backBtn = document.getElementById("backBtn");
const roundLabel = document.getElementById("roundLabel");
const playerOneBox = document.getElementById("playerOneBox");
const playerTwoBox = document.getElementById("playerTwoBox");
const statusCard = document.getElementById("statusCard");
const openClashBtn = document.getElementById("openClashBtn");
const verifyMatchBtn = document.getElementById("verifyMatchBtn");
const advanceModal = document.getElementById("advanceModal");
const advanceContinueBtn = document.getElementById("advanceContinueBtn");

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

if (advanceContinueBtn) {
    advanceContinueBtn.addEventListener("click", function () {
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

    playerOneBox.textContent =
        (match.player_one || "TBD") +
        (match.player_one_tag ? " (" + match.player_one_tag + ")" : "");

    playerTwoBox.textContent =
        (match.player_two || "TBD") +
        (match.player_two_tag ? " (" + match.player_two_tag + ")" : "");

    if (match.status === "Completed" && match.winner_username) {
        statusCard.textContent = "Winner: " + match.winner_username;
    } else {
        statusCard.textContent = match.status || "Ready";
    }

    if (match.status === "Completed") {
        verifyMatchBtn.textContent = "MATCH COMPLETE";
        verifyMatchBtn.disabled = true;
    } else {
        verifyMatchBtn.textContent = "VERIFY MATCH";
        verifyMatchBtn.disabled = false;
    }
}

function loadTournamentMatch() {
    fetch(API_BASE_URL + "/api/tournaments/" + currentTournamentId)
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
    if (!currentMatch) {
        alert("Match not loaded.");
        return;
    }

    let opponentFriendLink = null;

    if (username === currentMatch.player_one) {
        opponentFriendLink = currentMatch.player_two_friend_link;
    } else {
        opponentFriendLink = currentMatch.player_one_friend_link;
    }

    if (!opponentFriendLink) {
        alert("Opponent friend link not found.");
        return;
    }

    window.location.href = opponentFriendLink;
});

verifyMatchBtn.addEventListener("click", function () {
    if (!currentTournamentMatchId) {
        alert("Missing tournament match.");
        return;
    }

    verifyMatchBtn.textContent = "VERIFYING...";
    verifyMatchBtn.disabled = true;

    fetch(API_BASE_URL + "/api/tournament-matches/" + currentTournamentMatchId + "/verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username
        })
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (!data.success) {
            alert(data.message);

            verifyMatchBtn.textContent = "VERIFY MATCH";
            verifyMatchBtn.disabled = false;
            return;
        }

        if (data.champion) {
            localStorage.setItem(
                "lastTournamentChampion",
                JSON.stringify(data)
            );

            window.location.href = "tournament-winner.html";
            return;
        }

        if (data.message && data.message.includes("Final is ready")) {
            if (advanceModal) {
                advanceModal.classList.remove("hidden");
                return;
            }

            window.location.href = "tournament-room.html";
            return;
        }

        window.location.href = "tournament-room.html";
        return;
    })
    .catch(function (error) {
        console.log("TOURNAMENT VERIFY ERROR:", error);
        alert("Could not verify tournament match.");

        verifyMatchBtn.textContent = "VERIFY MATCH";
        verifyMatchBtn.disabled = false;
    });
});

loadTournamentMatch();

setInterval(loadTournamentMatch, 5000);