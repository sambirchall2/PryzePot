const backBtn = document.getElementById("backBtn");
const rlIdInput = document.getElementById("rlIdInput");
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

function showConnected(rlId) {
    rlIdInput.value = rlId;
    statusText.textContent = "Connected: " + rlId;
    statusText.classList.add("connected");
    saveBtn.textContent = "CONTINUE";
}

const cachedRlId = localStorage.getItem("rlId");

if (cachedRlId) {
    showConnected(cachedRlId);
}

apiFetch("/api/users/" + encodeURIComponent(username) + "/profile")
    .then(function (data) {
        if (!data.success || !data.user || !data.user.rl_id) return;

        localStorage.setItem("rlId", data.user.rl_id);
        showConnected(data.user.rl_id);
    })
    .catch(function (error) {
        console.log("ROCKET LEAGUE PROFILE LOAD ERROR:", error);
    });

function joinPendingMatch(matchId) {
    saveBtn.textContent = "JOINING...";
    saveBtn.disabled = true;

    apiFetch("/api/matches/" + matchId + "/join", {
        method: "POST",
        body: JSON.stringify({
            playerTag: localStorage.getItem("rlId")
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
            console.log("JOIN ROCKET LEAGUE MATCH ERROR:", error);

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
    const rlId = rlIdInput.value.trim();

    if (!username) {
        alert("Please log in first.");
        window.location.href = "../html/index.html";
        return;
    }

    if (rlId === "") {
        alert("Please enter your Rocket League ID.");
        return;
    }

    saveBtn.textContent = "SAVING...";
    saveBtn.disabled = true;

    apiFetch("/api/users/save-rocketleague", {
        method: "POST",
        body: JSON.stringify({
            rlId: rlId
        })
    })
        .then(function (data) {
            if (data.success !== true) {
                alert(data.message || "Could not save your Rocket League ID.");

                saveBtn.textContent = "SAVE & CONTINUE";
                saveBtn.disabled = false;
                return;
            }

            localStorage.setItem("rlId", rlId);

            showConnected(rlId);
            saveBtn.disabled = false;

            finishConnectRedirect();
        })
        .catch(function (error) {
            console.log("SAVE ROCKET LEAGUE ERROR:", error);

            alert("Could not save your Rocket League ID. Make sure your backend is running.");

            saveBtn.textContent = "SAVE & CONTINUE";
            saveBtn.disabled = false;
        });
});
