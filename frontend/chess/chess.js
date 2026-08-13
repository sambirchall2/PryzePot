const backBtn = document.getElementById("backBtn");
const onlineMode = document.getElementById("onlineMode");
const friendsMode = document.getElementById("friendsMode");
const tournamentMode = document.getElementById("tournamentMode");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "online.html";
    });
}

if (onlineMode) {
    onlineMode.addEventListener("click", function () {
        localStorage.removeItem("createType");
        localStorage.removeItem("tournamentSize");

        localStorage.setItem("afterConnectRedirect", "entry.html");
        window.location.href = "connect-chess.html";
    });
}

if (friendsMode) {
    // Friend challenges for Chess.com are not wired up yet (the challenge
    // backend still creates Clash matches). Online 1v1 + tournaments are live.
    friendsMode.classList.add("mode-card-disabled");
    friendsMode.addEventListener("click", function () {
        alert("Friend challenges for Chess.com are coming soon. Use Online or Tournament mode for now.");
    });
}

if (tournamentMode) {
    tournamentMode.addEventListener("click", function () {
        window.location.href = "tournament.html";
    });
}