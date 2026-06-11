const backBtn = document.getElementById("backBtn");
const tournamentCards = document.querySelectorAll(".tournament-create-card");

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