const backBtn = document.getElementById("backBtn");
const onlineMode = document.getElementById("onlineMode");
const tournamentMode = document.getElementById("tournamentMode");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "../html/home.html";
    });
}

if (onlineMode) {
    onlineMode.addEventListener("click", function () {
        window.location.href = "online.html";
    });
}

if (tournamentMode) {
    tournamentMode.addEventListener("click", function () {
        window.location.href = "tournament.html";
    });
}