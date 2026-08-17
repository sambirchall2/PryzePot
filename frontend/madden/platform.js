const backBtn = document.getElementById("backBtn");
const platformGrid = document.getElementById("platformGrid");
const continueBtn = document.getElementById("continueBtn");

const PLATFORMS = [
    { value: "ps5_xbox", label: "PS5 / XBOX" },
    { value: "pc", label: "PC" }
];

let selectedPlatform = null;

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "../html/play-mode.html";
    });
}

PLATFORMS.forEach(function (platform) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "select-card";

    card.innerHTML = `<div class="select-label">${platform.label}</div>`;

    card.addEventListener("click", function () {
        selectedPlatform = platform.value;

        document.querySelectorAll(".select-card").forEach(function (item) {
            item.classList.remove("selected");
        });

        card.classList.add("selected");

        continueBtn.disabled = false;
        continueBtn.textContent = "CONTINUE";
    });

    platformGrid.appendChild(card);
});

continueBtn.addEventListener("click", function () {
    if (selectedPlatform === null) return;

    localStorage.setItem("maddenPlatform", selectedPlatform);

    window.location.href = "skill-difficulty.html";
});
