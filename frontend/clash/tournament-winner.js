const backHomeBtn = document.getElementById("backHomeBtn");
const winnerName = document.getElementById("winnerName");
const winnerTag = document.getElementById("winnerTag");

const championData =
    JSON.parse(
        localStorage.getItem("lastTournamentChampion") || "{}"
    );

winnerName.textContent =
    championData.winnerUsername || "Champion";

winnerTag.textContent =
    championData.winnerTag || "";

if (backHomeBtn) {
    backHomeBtn.addEventListener("click", function () {
        localStorage.removeItem("currentTournamentId");
        localStorage.removeItem("currentTournamentMatchId");
        localStorage.removeItem("lastTournamentChampion");

        window.location.href = "home.html";
    });
}