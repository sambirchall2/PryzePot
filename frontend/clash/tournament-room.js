const tournamentSize =
    Number(localStorage.getItem("tournamentSize")) || 4;

const entryFee =
    Number(localStorage.getItem("entryFee")) || 1;

const username =
    localStorage.getItem("username") || "Player";

document.getElementById("tournamentSize").textContent =
    `${tournamentSize} Players`;

document.getElementById("entryFee").textContent =
    `$${entryFee}`;

document.getElementById("prizePool").textContent =
    `$${tournamentSize * entryFee}`;

const playerList = document.getElementById("playerList");

playerList.innerHTML = "";

for (let i = 0; i < tournamentSize; i++) {
    const div = document.createElement("div");

    if (i === 0) {
        div.className = "player-slot filled";
        div.textContent = username;
    } else {
        div.className = "player-slot";
        div.textContent = "Waiting...";
    }

    playerList.appendChild(div);
}