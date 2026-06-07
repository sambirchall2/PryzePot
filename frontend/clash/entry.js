const backBtn = document.getElementById("backBtn");
const entryGrid = document.getElementById("entryGrid");
const continueBtn = document.getElementById("continueBtn");

const entryFees = [
    { amount: 1, xp: 25 },
    { amount: 2, xp: 35 },
    { amount: 5, xp: 50 },
    { amount: 10, xp: 75 },
    { amount: 50, xp: 125 },
    { amount: 100, xp: 200 }
];

let selectedEntry = null;

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "connect-clash.html";
    });
}

entryFees.forEach(function (entry) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "entry-card";

    card.innerHTML = `
        <div class="entry-amount">$${entry.amount}</div>
        <div class="entry-label">ENTRY</div>
        <div class="entry-xp">+${entry.xp} XP</div>
    `;

    card.addEventListener("click", function () {
        selectedEntry = entry.amount;

        document.querySelectorAll(".entry-card").forEach(function (item) {
            item.classList.remove("selected");
        });

        card.classList.add("selected");

        localStorage.setItem("entryFee", selectedEntry);
        localStorage.setItem("entryXp", entry.xp);

        continueBtn.disabled = false;
        continueBtn.textContent = "CONTINUE WITH $" + selectedEntry;
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