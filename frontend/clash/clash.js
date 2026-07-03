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
        window.location.href = "connect-clash.html";
    });
}

if (friendsMode) {
    friendsMode.addEventListener("click", function () {
        window.location.href = "friends-mode.html";
    });
}

if (tournamentMode) {
    tournamentMode.addEventListener("click", function () {
        window.location.href = "tournament.html";
    });
}