const backBtn = document.getElementById("backBtn");
const entryGrid = document.getElementById("entryGrid");
const continueBtn = document.getElementById("continueBtn");

const entryFees = [1, 2, 5, 10, 50, 100];

let selectedEntry = null;

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "connect-clash.html";
    });
}

entryFees.forEach(function (amount) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "entry-card";

    card.innerHTML = `
        <div class="entry-amount">$${amount}</div>
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