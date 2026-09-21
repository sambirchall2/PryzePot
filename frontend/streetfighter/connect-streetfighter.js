const backBtn = document.getElementById("backBtn");
const capcomIdInput = document.getElementById("capcomIdInput");
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

function showConnected(capcomId) {
    capcomIdInput.value = capcomId;
    statusText.textContent = "Connected: " + capcomId;
    statusText.classList.add("connected");
    saveBtn.textContent = "CONTINUE";
}

const cachedCapcomId = localStorage.getItem("capcomId");

if (cachedCapcomId) {
    showConnected(cachedCapcomId);
}

apiFetch("/api/users/" + encodeURIComponent(username) + "/profile")
    .then(function (data) {
        if (!data.success || !data.user || !data.user.capcom_id) return;

        localStorage.setItem("capcomId", data.user.capcom_id);
        showConnected(data.user.capcom_id);
    })
    .catch(function (error) {
        console.log("STREET FIGHTER PROFILE LOAD ERROR:", error);
    });

function joinPendingMatch(matchId) {
    saveBtn.textContent = "JOINING...";
    saveBtn.disabled = true;

    apiFetch("/api/matches/" + matchId + "/join", {
        method: "POST",
        body: JSON.stringify({
            playerTag: localStorage.getItem("capcomId")
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
            console.log("JOIN STREET FIGHTER MATCH ERROR:", error);

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
    const capcomId = capcomIdInput.value.trim();

    if (!username) {
        alert("Please log in first.");
        window.location.href = "../html/index.html";
        return;
    }

    if (capcomId === "") {
        alert("Please enter your Capcom ID.");
        return;
    }

    saveBtn.textContent = "SAVING...";
    saveBtn.disabled = true;

    apiFetch("/api/users/save-streetfighter", {
        method: "POST",
        body: JSON.stringify({
            capcomId: capcomId
        })
    })
        .then(function (data) {
            if (data.success !== true) {
                alert(data.message || "Could not save your Capcom ID.");

                saveBtn.textContent = "SAVE & CONTINUE";
                saveBtn.disabled = false;
                return;
            }

            localStorage.setItem("capcomId", capcomId);

            showConnected(capcomId);
            saveBtn.disabled = false;

            finishConnectRedirect();
        })
        .catch(function (error) {
            console.log("SAVE STREET FIGHTER ERROR:", error);

            alert("Could not save your Capcom ID. Make sure your backend is running.");

            saveBtn.textContent = "SAVE & CONTINUE";
            saveBtn.disabled = false;
        });
});
