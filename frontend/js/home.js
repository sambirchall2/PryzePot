const username = localStorage.getItem("username");
const balance = localStorage.getItem("balance");

if (!username) {
    window.location.href = "index.html";
}

const usernameDisplay = document.getElementById("usernameDisplay");
const balanceDisplay = document.getElementById("balanceDisplay");

if (usernameDisplay) {
    usernameDisplay.textContent = username;
}

if (balanceDisplay) {
    balanceDisplay.textContent = balance || "0";
}

const clashPlayBtn = document.getElementById("clashPlayBtn");

if (clashPlayBtn) {
    clashPlayBtn.addEventListener("click", function () {
        window.location.href = "../clash/clash.html";
    });
}

const joinTournamentBtn = document.getElementById("joinTournamentBtn");

if (joinTournamentBtn) {
    joinTournamentBtn.addEventListener("click", function () {
        window.location.href = "../clash/clash.html";
    });
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("username");
        localStorage.removeItem("balance");

        localStorage.removeItem("clashPlayerTag");
        localStorage.removeItem("clashPlayerName");
        localStorage.removeItem("clashTrophies");
        localStorage.removeItem("clashExpLevel");
        localStorage.removeItem("clashFriendLink");

        localStorage.removeItem("entryFee");
        localStorage.removeItem("currentMatchId");
        localStorage.removeItem("matchResult");
        localStorage.removeItem("rulesAccepted");

        window.location.href = "index.html";
    });
}