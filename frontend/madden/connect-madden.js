const backBtn = document.getElementById("backBtn");
const eaNameInput = document.getElementById("eaNameInput");
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

function showConnected(eaName) {
    eaNameInput.value = eaName;
    statusText.textContent = "Connected: " + eaName;
    statusText.classList.add("connected");
    saveBtn.textContent = "CONTINUE";
}

// Pre-fill instantly from the last-known local value (fast, may be stale),
// then reconcile with the profile fetch below (the source of truth per
// chat - a name saved from another device/session should still show up).
const cachedEaName = localStorage.getItem("maddenEaName");

if (cachedEaName) {
    showConnected(cachedEaName);
}

apiFetch("/api/users/" + encodeURIComponent(username) + "/profile")
    .then(function (data) {
        if (!data.success || !data.user || !data.user.ea_name) return;

        localStorage.setItem("maddenEaName", data.user.ea_name);
        showConnected(data.user.ea_name);
    })
    .catch(function (error) {
        console.log("MADDEN PROFILE LOAD ERROR:", error);
    });

// Joining (match-board.js's join-btn) always routes through this page
// first, EA-name-confirm same as creation, then resumes the join itself
// here rather than through a separate "confirm you want to join" screen -
// there was nothing left to confirm once the EA name step is done.
function joinPendingMatch(matchId) {
    saveBtn.textContent = "JOINING...";
    saveBtn.disabled = true;

    let matchType = "instant";

    apiFetch("/api/matches/" + matchId)
        .then(function (data) {
            if (!data.success || !data.match) {
                throw new Error(data.message || "Match not found.");
            }

            matchType = data.match.matchType;

            return apiFetch("/api/matches/" + matchId + "/join", {
                method: "POST",
                body: JSON.stringify({
                    playerTag: localStorage.getItem("maddenEaName"),
                    platform: data.match.platform
                })
            });
        })
        .then(function (data) {
            if (!data.success) {
                throw new Error(data.message || "Could not join this match.");
            }

            localStorage.removeItem("pendingJoinMatchId");

            // Scheduled matches don't move into rules/team-select yet -
            // that flow launches when the scheduled time hits, not at
            // join time (see chat), so a scheduled joiner just goes back
            // to the match's detail page and waits. Instant matches go
            // straight into team-select since there's nothing to wait for.
            if (matchType === "scheduled") {
                window.location.href = "../html/match-detail.html?matchId=" + matchId + "&type=match";
                return;
            }

            localStorage.setItem("currentMatchId", matchId);
            window.location.href = "team-select.html";
        })
        .catch(function (error) {
            console.log("JOIN MADDEN MATCH ERROR:", error);

            alert(error.message || "Could not join this match.");

            localStorage.removeItem("pendingJoinMatchId");
            window.location.href = "match-board.html";
        });
}

function finishConnectRedirect() {
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
    const eaName = eaNameInput.value.trim();

    if (!username) {
        alert("Please log in first.");
        window.location.href = "../html/index.html";
        return;
    }

    if (eaName === "") {
        alert("Please enter your EA account name.");
        return;
    }

    saveBtn.textContent = "SAVING...";
    saveBtn.disabled = true;

    apiFetch("/api/users/save-madden", {
        method: "POST",
        body: JSON.stringify({
            eaName: eaName
        })
    })
        .then(function (data) {
            if (data.success !== true) {
                alert(data.message || "Could not save your EA account name.");

                saveBtn.textContent = "SAVE & CONTINUE";
                saveBtn.disabled = false;
                return;
            }

            localStorage.setItem("maddenEaName", eaName);

            showConnected(eaName);
            saveBtn.disabled = false;

            finishConnectRedirect();
        })
        .catch(function (error) {
            console.log("SAVE MADDEN ERROR:", error);

            alert("Could not save your EA account name. Make sure your backend is running.");

            saveBtn.textContent = "SAVE & CONTINUE";
            saveBtn.disabled = false;
        });
});
