const backBtn = document.getElementById("backBtn");
const editionGrid = document.getElementById("editionGrid");
const continueBtn = document.getElementById("continueBtn");

// Purely a label players use to filter/match up on - gameplay, scoring,
// and verification are identical across editions (see chat), so this
// never branches any backend logic. Add a new year here (and to
// EDITION_LABELS in madden/match-board.js) when the next Madden ships.
const EDITIONS = [
    { value: "25", label: "Madden 25" },
    { value: "26", label: "Madden 26" }
];

let selectedEdition = null;

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "../html/play-mode.html";
    });
}

EDITIONS.forEach(function (edition) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "select-card";

    card.innerHTML = `<div class="select-label">${edition.label}</div>`;

    card.addEventListener("click", function () {
        selectedEdition = edition.value;

        document.querySelectorAll(".select-card").forEach(function (item) {
            item.classList.remove("selected");
        });

        card.classList.add("selected");

        continueBtn.disabled = false;
        continueBtn.textContent = "CONTINUE";
    });

    editionGrid.appendChild(card);
});

continueBtn.addEventListener("click", function () {
    if (selectedEdition === null) return;

    localStorage.setItem("maddenEdition", selectedEdition);

    window.location.href = "platform.html";
});
