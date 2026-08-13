const backBtn = document.getElementById("backBtn");
const entryAmountDisplay = document.getElementById("entryAmountDisplay");
const playerTagDisplay = document.getElementById("playerTagDisplay");
const postMatchBtn = document.getElementById("postMatchBtn");

const username = localStorage.getItem("username");
const entryFee = localStorage.getItem("entryFee");
const chessUsername = getChessUsername();
const createType = localStorage.getItem("createType");
const tournamentSize = localStorage.getItem("tournamentSize");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "rules.html";
    });
}

if (!username) {
    window.location.href = "../html/index.html";
}

if (!entryFee) {
    window.location.href = "entry.html";
}

if (!chessUsername) {
    window.location.href = "connect-chess.html";
}

entryAmountDisplay.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + entryFee;
playerTagDisplay.textContent = chessUsername;

if (createType === "tournament" && tournamentSize) {
    postMatchBtn.textContent = "POST TOURNAMENT";
}

postMatchBtn.addEventListener("click", function () {
    postMatchBtn.textContent = "POSTING...";
    postMatchBtn.disabled = true;

    if (createType === "tournament" && tournamentSize) {
        const tournamentData = {
    game: "Chess.com",
    playerTag: chessUsername,
    tournamentSize: Number(tournamentSize),
    entryFee: Number(entryFee)
};

        apiFetch("/api/tournaments", {
            method: "POST",
            body: JSON.stringify(tournamentData)
        })
        .then(function (data) {
            if (data.success === true) {
                localStorage.setItem("currentTournamentId", data.tournament.id);

                localStorage.removeItem("createType");

            window.location.href = "tournament-room.html";
            } else {
                alert(data.message);
                postMatchBtn.textContent = "POST TOURNAMENT";
                postMatchBtn.disabled = false;
            }
        })
        .catch(function (error) {
            console.log("ERROR:", error);

            alert("Could not post tournament. Make sure your backend server is running.");

            postMatchBtn.textContent = "POST TOURNAMENT";
            postMatchBtn.disabled = false;
        });

        return;
    }

    const matchData = {
        game: "Chess.com",
        playerTag: chessUsername,
        entryFee: Number(entryFee)
    };

    apiFetch("/api/matches", {
        method: "POST",
        body: JSON.stringify(matchData)
    })
    .then(function (data) {
        if (data.success === true) {
            localStorage.setItem("currentMatchId", data.match.id);
            window.location.href = "match-room.html";
        } else {
            alert(data.message);
            postMatchBtn.textContent = "POST MATCH";
            postMatchBtn.disabled = false;
        }
    })
    .catch(function (error) {
        console.log("ERROR:", error);

        alert("Could not post match. Make sure your backend server is running.");

        postMatchBtn.textContent = "POST MATCH";
        postMatchBtn.disabled = false;
    });
});