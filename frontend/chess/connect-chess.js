const backBtn = document.getElementById("backBtn");
const chessUsernameInput = document.getElementById("chessUsernameInput");
const verifyBtn = document.getElementById("verifyBtn");
const statusText = document.getElementById("statusText");

const username = localStorage.getItem("username");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        localStorage.removeItem("pendingTournamentId");
        localStorage.removeItem("pendingTournamentSetAt");
        localStorage.removeItem("afterConnectRedirect");

        window.location.href = "online.html";
    });
}

const savedUsername = localStorage.getItem("chessUsername");
const savedName = localStorage.getItem("chessName");

if (savedUsername) {
    chessUsernameInput.value = savedUsername;

    statusText.textContent = savedName
        ? "Connected: " + savedName + " (" + savedUsername + ")"
        : "Connected: " + savedUsername;

    statusText.classList.add("connected");
    verifyBtn.textContent = "CONTINUE";
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

    const afterConnectRedirect =
        localStorage.getItem("afterConnectRedirect") || "entry.html";

    localStorage.removeItem("afterConnectRedirect");

    window.location.href = afterConnectRedirect;
}

verifyBtn.addEventListener("click", function () {
    const chessUsername = chessUsernameInput.value.trim();

    if (!username) {
        alert("Please log in first.");
        window.location.href = "../html/index.html";
        return;
    }

    if (chessUsername === "") {
        alert("Please enter your Chess.com username.");
        return;
    }

    verifyBtn.textContent = "VERIFYING...";
    verifyBtn.disabled = true;

    apiFetch("/api/chess/verify-player", {
        method: "POST",
        body: JSON.stringify({
            username: chessUsername
        })
    })
        .then(function (data) {
            if (data.success !== true) {
                alert(data.message);

                verifyBtn.textContent = "VERIFY ACCOUNT";
                verifyBtn.disabled = false;
                return;
            }

            localStorage.setItem("chessUsername", data.player.username);
            localStorage.setItem("chessName", data.player.name || data.player.username);
            localStorage.setItem("chessRating", data.player.rating || "");

            return apiFetch("/api/users/save-chess", {
                method: "POST",
                body: JSON.stringify({
                    chessUsername: data.player.username,
                    chessName: data.player.name || data.player.username,
                    chessRating: data.player.rating || null
                })
            })
                .then(function (saveData) {
                    if (saveData.success !== true) {
                        alert(saveData.message || "Chess.com verified, but could not save to account.");

                        verifyBtn.textContent = "VERIFY ACCOUNT";
                        verifyBtn.disabled = false;
                        return;
                    }

                    statusText.textContent =
                        "Connected: " + (data.player.name || data.player.username) + " (" + data.player.username + ")";

                    statusText.classList.add("connected");

                    finishConnectRedirect();
                });
        })
        .catch(function (error) {
            console.log("ERROR:", error);

            alert("Could not verify Chess.com account. Make sure your backend is running.");

            verifyBtn.textContent = "VERIFY ACCOUNT";
            verifyBtn.disabled = false;
        });
});
