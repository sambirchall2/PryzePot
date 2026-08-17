const backBtn = document.getElementById("backBtn");
const skillGrid = document.getElementById("skillGrid");
const continueBtn = document.getElementById("continueBtn");

const SKILL_DIFFICULTIES = [
    { value: "rookie", label: "Rookie" },
    { value: "pro", label: "Pro" },
    { value: "all_pro", label: "All-Pro" },
    { value: "all_madden", label: "All-Madden" }
];

let selectedSkillDifficulty = null;

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "platform.html";
    });
}

SKILL_DIFFICULTIES.forEach(function (skill) {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "select-card";

    card.innerHTML = `<div class="select-label">${skill.label}</div>`;

    card.addEventListener("click", function () {
        selectedSkillDifficulty = skill.value;

        document.querySelectorAll(".select-card").forEach(function (item) {
            item.classList.remove("selected");
        });

        card.classList.add("selected");

        continueBtn.disabled = false;
        continueBtn.textContent = "CONTINUE";
    });

    skillGrid.appendChild(card);
});

// Both the Play Now and Schedule paths funnel through platform.html ->
// here (see play-mode.js); maddenPostSetupRedirect was stashed there and
// points at whichever one the player actually chose.
continueBtn.addEventListener("click", function () {
    if (selectedSkillDifficulty === null) return;

    localStorage.setItem("maddenSkillDifficulty", selectedSkillDifficulty);

    const nextStep = localStorage.getItem("maddenPostSetupRedirect") || "post-match.html";
    localStorage.removeItem("maddenPostSetupRedirect");

    window.location.href = nextStep;
});
