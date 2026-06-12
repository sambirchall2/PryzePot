const winnerName = document.getElementById("winnerName");
const winnerTag = document.getElementById("winnerTag");
const homeBtn = document.getElementById("homeBtn");

const championData =
    JSON.parse(
        localStorage.getItem("lastTournamentChampion") || "{}"
    );

winnerName.textContent =
    championData.winnerUsername || "Champion";

winnerTag.textContent =
    championData.winnerTag || "";

homeBtn.addEventListener("click", function () {
    localStorage.removeItem("currentTournamentId");
    localStorage.removeItem("currentTournamentMatchId");

    window.location.href = "online.html";
});