const backBtn = document.getElementById("backBtn");
const entryAmountDisplay = document.getElementById("entryAmountDisplay");
const eaNameDisplay = document.getElementById("eaNameDisplay");
const platformDisplay = document.getElementById("platformDisplay");
const skillDisplay = document.getElementById("skillDisplay");
const postMatchBtn = document.getElementById("postMatchBtn");

const PLATFORM_LABELS = {
    ps5_xbox: "PS5 / Xbox",
    pc: "PC"
};

const SKILL_LABELS = {
    rookie: "Rookie",
    pro: "Pro",
    all_pro: "All-Pro",
    all_madden: "All-Madden"
};

const username = localStorage.getItem("username");
const entryFee = localStorage.getItem("entryFee");
const maddenEaName = localStorage.getItem("maddenEaName");
const maddenPlatform = localStorage.getItem("maddenPlatform");
const maddenSkillDifficulty = localStorage.getItem("maddenSkillDifficulty");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "skill-difficulty.html";
    });
}

if (!username) {
    window.location.href = "../html/index.html";
}

if (!entryFee) {
    window.location.href = "entry.html";
}

if (!maddenEaName) {
    window.location.href = "connect-madden.html";
}

if (!maddenPlatform) {
    window.location.href = "platform.html";
}

if (!maddenSkillDifficulty) {
    window.location.href = "skill-difficulty.html";
}

entryAmountDisplay.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + entryFee;
eaNameDisplay.textContent = maddenEaName;
platformDisplay.textContent = PLATFORM_LABELS[maddenPlatform] || maddenPlatform;
skillDisplay.textContent = SKILL_LABELS[maddenSkillDifficulty] || maddenSkillDifficulty;

postMatchBtn.addEventListener("click", function () {
    postMatchBtn.textContent = "POSTING...";
    postMatchBtn.disabled = true;

    const matchData = {
        game: "Madden NFL",
        playerTag: maddenEaName,
        entryFee: Number(entryFee),
        platform: maddenPlatform,
        skillDifficulty: maddenSkillDifficulty
    };

    apiFetch("/api/matches", {
        method: "POST",
        body: JSON.stringify(matchData)
    })
    .then(function (data) {
        if (data.success === true) {
            localStorage.setItem("currentMatchId", data.match.id);

            // Now that the join flow exists, the creator lands in the
            // waiting room (same as Clash/Chess) instead of the board - that
            // room is what pops up "a player joined" the moment it happens.
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
