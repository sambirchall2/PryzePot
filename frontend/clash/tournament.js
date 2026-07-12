const backBtn = document.getElementById("backBtn");
const tournamentCards = document.querySelectorAll(".tournament-create-card");
const seasonZeroStatus = document.getElementById("seasonZeroStatus");
const seasonZeroJoinBtn = document.getElementById("seasonZeroJoinBtn");

const username = localStorage.getItem("username");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "clash.html";
    });
}

tournamentCards.forEach(function (card) {
    card.addEventListener("click", function () {
        const tournamentSize = card.dataset.size;

        localStorage.setItem("createType", "tournament");
        localStorage.setItem("tournamentSize", tournamentSize);
        localStorage.setItem("afterConnectRedirect", "entry.html");

        window.location.href = "connect-clash.html";
    });
});

function loadSeasonZero() {
    if (!seasonZeroStatus && !seasonZeroJoinBtn) return;

    apiFetch("/api/tournaments/season-zero")
        .then(function (data) {
            if (!data.success) return;

            const tournament = data.tournament;

            if (seasonZeroStatus) {
                seasonZeroStatus.textContent =
                    tournament.current_players + " / " + tournament.max_players + " Players Registered";
            }

            if (seasonZeroJoinBtn) {
                if (tournament.status !== "Open") {
                    seasonZeroJoinBtn.disabled = true;
                    seasonZeroJoinBtn.textContent =
                        tournament.status === "Full" ? "FULL" : "CLOSED";
                } else {
                    seasonZeroJoinBtn.disabled = false;
                    seasonZeroJoinBtn.textContent = "JOIN";
                    seasonZeroJoinBtn.dataset.tournamentId = tournament.id;
                }
            }
        })
        .catch(function (error) {
            console.log("SEASON ZERO LOAD ERROR:", error);
        });
}

if (seasonZeroJoinBtn) {
    seasonZeroJoinBtn.addEventListener("click", function () {
        if (!username) {
            window.location.href = "../html/index.html";
            return;
        }

        const tournamentId = seasonZeroJoinBtn.dataset.tournamentId;
        if (!tournamentId) return;

        localStorage.setItem("pendingTournamentId", tournamentId);
        localStorage.setItem("afterConnectRedirect", "match-board.html");

        window.location.href = "connect-clash.html";
    });
}

loadSeasonZero();
setInterval(loadSeasonZero, 20000);