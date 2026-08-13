const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "../html/index.html";
}

const chessUsername = getChessUsername();
const chessName = localStorage.getItem("chessName");
const chessRating = localStorage.getItem("chessRating");

const pendingJoinType = localStorage.getItem("pendingJoinType");
const pendingJoinId = localStorage.getItem("pendingJoinId");

const backBtn = document.getElementById("backBtn");
const cancelJoinBtn = document.getElementById("cancelJoinBtn");
const confirmJoinBtn = document.getElementById("confirmJoinBtn");
const subtitleText = document.getElementById("subtitleText");
const chessNameText = document.getElementById("clashNameText");
const chessUsernameText = document.getElementById("clashTagText");
const chessRatingText = document.getElementById("clashTrophiesText");

function clearPendingJoin() {
    localStorage.removeItem("pendingJoinType");
    localStorage.removeItem("pendingJoinId");
}

function returnToMatchBoard() {
    clearPendingJoin();
    window.location.href = "match-board.html";
}

if (!pendingJoinType || !pendingJoinId) {
    returnToMatchBoard();
} else if (!chessUsername) {
    localStorage.setItem("afterConnectRedirect", "verify-chess-join.html");
    window.location.href = "connect-chess.html";
} else {
    if (subtitleText) {
        subtitleText.textContent = pendingJoinType === "tournament"
            ? "Double check this is the Chess.com account you want to use for this tournament."
            : "Double check this is the Chess.com account you want to use for this 1v1.";
    }

    if (chessNameText) chessNameText.textContent = chessName || "-";
    if (chessUsernameText) chessUsernameText.textContent = chessUsername || "-";
    if (chessRatingText) chessRatingText.textContent = chessRating || "-";
}

if (backBtn) {
    backBtn.addEventListener("click", returnToMatchBoard);
}

if (cancelJoinBtn) {
    cancelJoinBtn.addEventListener("click", returnToMatchBoard);
}

if (confirmJoinBtn) {
    confirmJoinBtn.addEventListener("click", function () {
        if (!pendingJoinType || !pendingJoinId) {
            returnToMatchBoard();
            return;
        }

        confirmJoinBtn.disabled = true;
        confirmJoinBtn.textContent = "JOINING...";

        const endpoint = pendingJoinType === "tournament"
            ? "/api/tournaments/" + pendingJoinId + "/join"
            : "/api/matches/" + pendingJoinId + "/join";

        apiFetch(endpoint, {
            method: "POST",
            body: JSON.stringify({
                playerTag: chessUsername
            })
        })
            .then(function (data) {
                if (!data.success) {
                    confirmJoinBtn.disabled = false;
                    confirmJoinBtn.textContent = "CONFIRM & JOIN";
                    alert(data.message);
                    return;
                }

                clearPendingJoin();

                if (pendingJoinType === "tournament") {
                    localStorage.setItem("currentTournamentId", pendingJoinId);
                    window.location.href = "tournament-room.html";
                } else {
                    localStorage.setItem("currentMatchId", data.match.id);
                    window.location.href = "match-room.html";
                }
            })
            .catch(function (error) {
                console.log("VERIFY CHESS JOIN ERROR:", error);
                confirmJoinBtn.disabled = false;
                confirmJoinBtn.textContent = "CONFIRM & JOIN";
                alert("Could not join. Make sure backend is running.");
            });
    });
}
