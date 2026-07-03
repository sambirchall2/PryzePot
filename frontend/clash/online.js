const backBtn = document.getElementById("backBtn");
const createMatchBtn = document.getElementById("createMatchBtn");
const friendsModeBtn = document.getElementById("friendsModeBtn");
const tournamentModeBtn = document.getElementById("tournamentModeBtn");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "clash.html";
    });
}

if (createMatchBtn) {
    createMatchBtn.addEventListener("click", function () {
        window.location.href = "clash.html";
    });
}

if (friendsModeBtn) {
    friendsModeBtn.addEventListener("click", function () {
        window.location.href = "friends-mode.html";
    });
}

if (tournamentModeBtn) {
    tournamentModeBtn.addEventListener("click", function () {
        window.location.href = "tournament.html";
    });
}