const backBtn = document.getElementById("backBtn");
const subtitle = document.getElementById("subtitle");
const playNowBtn = document.getElementById("playNowBtn");
const playNowHint = document.getElementById("playNowHint");
const scheduleBtn = document.getElementById("scheduleBtn");

const createGame = localStorage.getItem("createGame");
const createType = localStorage.getItem("createType");
const tournamentSize = localStorage.getItem("tournamentSize");

const GAME_LABELS = {
    clash: "Clash Royale",
    chess: "Chess.com"
};

if (!createGame) {
    window.location.href = "games.html";
}

const isTournament = createType === "tournament" && tournamentSize;

if (subtitle) {
    const gameLabel = GAME_LABELS[createGame] || "Your match";
    const modeLabel = isTournament
        ? tournamentSize + "-Player Tournament"
        : "1v1 Online Match";

    subtitle.textContent = gameLabel + " · " + modeLabel;
}

if (playNowHint && isTournament) {
    playNowHint.textContent = "Create your tournament instantly and set up the bracket";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "../" + createGame + "/entry.html";
    });
}

if (playNowBtn) {
    playNowBtn.addEventListener("click", function () {
        window.location.href = "../" + createGame + "/rules.html";
    });
}

if (scheduleBtn) {
    scheduleBtn.addEventListener("click", function () {
        window.location.href = "schedule-match.html";
    });
}
