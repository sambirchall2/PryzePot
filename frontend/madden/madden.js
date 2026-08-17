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
        window.location.href = "connect-madden.html";
    });
}

if (friendsMode) {
    // The /api/friends/challenge backend still hard-creates Clash Royale
    // matches (reads clash_tag directly) - not game-aware yet, so Friends
    // Mode stays disabled for Madden until that's generalized, same as
    // Chess.com's friends mode today (see frontend/chess/chess.js).
    friendsMode.classList.add("mode-card-disabled");
    friendsMode.addEventListener("click", function () {
        alert("Friend challenges for Madden are coming soon. Use Online mode for now.");
    });
}

if (tournamentMode) {
    // Madden has no tournament flow - the mode-select screen only shows
    // Online & Friends for this game (see chat); this card is disabled
    // rather than removed so the layout matches the other games.
    tournamentMode.addEventListener("click", function () {
        alert("Madden tournaments are coming soon. Use Online mode for now.");
    });
}
