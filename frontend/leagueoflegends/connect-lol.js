const backBtn = document.getElementById("backBtn");
const riotIdInput = document.getElementById("riotIdInput");
const saveBtn = document.getElementById("saveBtn");
const statusText = document.getElementById("statusText");

const username = localStorage.getItem("username");

if (!username) {
    alert("Please log in first.");
    window.location.href = "../html/index.html";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        localStorage.removeItem("afterConnectRedirect");
        localStorage.removeItem("pendingJoinMatchId");
        window.location.href = "online.html";
    });
}

function showConnected(riotId) {
    riotIdInput.value = riotId;
    statusText.textContent = "Connected: " + riotId;
    statusText.classList.add("connected");
    saveBtn.textContent = "CONTINUE";
}

const cachedRiotId = localStorage.getItem("riotId");

if (cachedRiotId) {
    showConnected(cachedRiotId);
}

apiFetch("/api/users/" + encodeURIComponent(username) + "/profile")
    .then(function (data) {
        if (!data.success || !data.user || !data.user.riot_id) return;

        localStorage.setItem("riotId", data.user.riot_id);
        showConnected(data.user.riot_id);
    })
    .catch(function (error) {
        console.log("LEAGUE OF LEGENDS PROFILE LOAD ERROR:", error);
    });

function joinPendingMatch(matchId) {
    saveBtn.textContent = "JOINING...";
    saveBtn.disabled = true;

    apiFetch("/api/matches/" + matchId + "/join", {
        method: "POST",
        body: JSON.stringify({
            playerTag: localStorage.getItem("riotId")
        })
    })
        .then(function (data) {
            if (!data.success) {
                throw new Error(data.message || "Could not join this match.");
            }

            localStorage.removeItem("pendingJoinMatchId");
            localStorage.setItem("currentMatchId", matchId);
            window.location.href = "match-room.html";
        })
        .catch(function (error) {
            console.log("JOIN LEAGUE OF LEGENDS MATCH ERROR:", error);

            alert(error.message || "Could not join this match.");

            localStorage.removeItem("pendingJoinMatchId");
            window.location.href = "match-board.html";
        });
}

function finishConnectRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const isFriendChallenge = urlParams.get("friendChallenge") === "1";
    const challengeMatchId = urlParams.get("matchId");

    if (isFriendChallenge && challengeMatchId) {
        localStorage.setItem("currentMatchId", challengeMatchId);
        window.location.href = "match-room.html";
        return;
    }

    const pendingJoinMatchId = localStorage.getItem("pendingJoinMatchId");

    if (pendingJoinMatchId) {
        joinPendingMatch(pendingJoinMatchId);
        return;
    }

    const afterConnectRedirect =
        localStorage.getItem("afterConnectRedirect") || "entry.html";

    localStorage.removeItem("afterConnectRedirect");

    window.location.href = afterConnectRedirect;
}

saveBtn.addEventListener("click", function () {
    const riotId = riotIdInput.value.trim();

    if (!username) {
        alert("Please log in first.");
        window.location.href = "../html/index.html";
        return;
    }

    if (riotId === "") {
        alert("Please enter your Riot ID.");
        return;
    }

    saveBtn.textContent = "SAVING...";
    saveBtn.disabled = true;

    apiFetch("/api/users/save-lol", {
        method: "POST",
        body: JSON.stringify({
            riotId: riotId
        })
    })
        .then(function (data) {
            if (data.success !== true) {
                alert(data.message || "Could not save your Riot ID.");

                saveBtn.textContent = "SAVE & CONTINUE";
                saveBtn.disabled = false;
                return;
            }

            localStorage.setItem("riotId", riotId);

            showConnected(riotId);
            saveBtn.disabled = false;

            finishConnectRedirect();
        })
        .catch(function (error) {
            console.log("SAVE LEAGUE OF LEGENDS ERROR:", error);

            alert("Could not save your Riot ID. Make sure your backend is running.");

            saveBtn.textContent = "SAVE & CONTINUE";
            saveBtn.disabled = false;
        });
});
