const backBtn = document.getElementById("backBtn");
const entryGrid = document.getElementById("entryGrid");
const continueBtn = document.getElementById("continueBtn");
const entryBalance = document.getElementById("entryBalance");

const entryFees = [25, 50, 100, 250, 500, 1000, 2500];
const username = localStorage.getItem("username");

let selectedEntry = null;

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "connect-chess.html";
    });
}

function renderBalance(balance) {
    if (!entryBalance) return;

    entryBalance.innerHTML =
        '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' +
        Number(balance || 0).toLocaleString();
}

function loadBalance() {
    if (!username) return;

    apiFetch("/api/users/" + encodeURIComponent(username) + "/profile")
        .then(function (data) {
            if (!data.success || !data.user) return;

            localStorage.setItem("balance", data.user.balance);
            renderBalance(data.user.balance);
        })
        .catch(function (error) {
            console.log("ENTRY BALANCE ERROR:", error);
        });
}

renderBalance(localStorage.getItem("balance"));
loadBalance();

entryFees.forEach(function (amount) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "entry-card";

    card.innerHTML = `
        <div class="entry-amount"><img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">${amount}</div>
        <div class="entry-label">ENTRY</div>
    `;

    card.addEventListener("click", function () {
        selectedEntry = amount;

        document.querySelectorAll(".entry-card").forEach(function (item) {
            item.classList.remove("selected");
        });

        card.classList.add("selected");

        localStorage.setItem("entryFee", selectedEntry);
        localStorage.removeItem("entryXp");

        continueBtn.disabled = false;
        continueBtn.textContent = "CONTINUE WITH " + selectedEntry + " VAULT CREDITS";
    });

    entryGrid.appendChild(card);
});

continueBtn.addEventListener("click", function () {
    if (selectedEntry === null) {
        return;
    }

    localStorage.removeItem("currentMatchId");
    localStorage.removeItem("selectedMatchId");
    localStorage.removeItem("lastVerifiedMatch");

    window.location.href = "rules.html";
});