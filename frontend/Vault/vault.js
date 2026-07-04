const backButton = document.getElementById("backButton");
const currentLevelText = document.getElementById("currentLevel");
const xpAmount = document.getElementById("xpAmount");
const xpText = document.getElementById("xpText");
const xpFill = document.getElementById("xpFill");
const nextRewardText = document.getElementById("nextReward");
const vaultTrack = document.getElementById("vaultTrack");
const previewPanel = document.getElementById("previewPanel");

const currentLevel = Number(localStorage.getItem("level")) || 1;
const currentXP = Number(localStorage.getItem("xp")) || 0;
const xpNeededForNextLevel = currentLevel * 100;

const vaultPacks = [
    {
        level: 5,
        name: "Recruit Vault",
        image: "../assets/vault/vaults/recruit-vault.png",
        items: [
            ["Avatar", "Fireborn"],
            ["Avatar", "Frost Bite"],
            ["Avatar", "Storm Face"],
            ["Banner", "Inferno"],
            ["Banner", "Ice Wall"],
            ["Banner", "Dark Matter"],
            ["Frame", "Bronze Edge"],
            ["Title", "The Grinder"],
            ["Badge", "Rising Player"]
        ]
    },
    {
        level: 10,
        name: "Contender Vault",
        image: "../assets/vault/vaults/contender-vault.png",
        items: [
            ["Avatar", "Crown Core"],
            ["Avatar", "Dragon Pulse"],
            ["Avatar", "Skull Shade"],
            ["Banner", "Lightning Run"],
            ["Banner", "Neon Galaxy"],
            ["Banner", "Lime Smoke"],
            ["Frame", "Silver Edge"],
            ["Title", "King Slayer"],
            ["Badge", "Veteran"],
            ["Badge", "Shield Mark"]
        ]
    },
    {
        level: 15,
        name: "Elite Vault",
        image: "../assets/vault/vaults/elite-vault.png",
        items: [
            ["Avatar", "Neon Wizard"],
            ["Avatar", "Cyber Knight"],
            ["Avatar", "Dark Mask"],
            ["Banner", "Green Fire"],
            ["Banner", "Battlefield"],
            ["Banner", "Crystal Core"],
            ["Frame", "Gold Edge"],
            ["Title", "Clash Master"],
            ["Badge", "Winner"]
        ]
    },
    {
        level: 20,
        name: "Champion Vault",
        image: "../assets/vault/vaults/champion-vault.png",
        items: [
            ["Avatar", "Inferno Dragon"],
            ["Avatar", "Royal Ghost"],
            ["Avatar", "Void Reaper"],
            ["Banner", "Inferno Banner"],
            ["Banner", "Thunder Vault"],
            ["Banner", "Toxic Neon"],
            ["Frame", "Diamond Edge"],
            ["Title", "Champion"],
            ["Badge", "Champion Badge"]
        ]
    },
    {
        level: 30,
        name: "Master Vault",
        image: "../assets/vault/vaults/master-vault.png",
        items: [
            ["Avatar", "Neon Wolf"],
            ["Avatar", "Vault Guardian"],
            ["Avatar", "Crown Phantom"],
            ["Banner", "Master Galaxy"],
            ["Banner", "Crown Flame"],
            ["Banner", "Overcharge"],
            ["Frame", "Master Frame"],
            ["Title", "Master"],
            ["Badge", "Master Badge"]
        ]
    },
    {
        level: 50,
        name: "Legend Vault",
        image: "../assets/vault/vaults/legend-vault.png",
        items: [
            ["Avatar", "Legend Crown"],
            ["Avatar", "Ancient Dragon"],
            ["Avatar", "Final Boss"],
            ["Banner", "Legend Galaxy"],
            ["Banner", "Eternal Flame"],
            ["Banner", "God Spark"],
            ["Frame", "Legend Frame"],
            ["Title", "Pryze Legend"],
            ["Badge", "Legend Badge"]
        ]
    }
];

if (backButton) {
    backButton.addEventListener("click", () => {
        window.location.href = "../html/home.html";
    });
}

currentLevelText.textContent = `Level ${currentLevel}`;
xpAmount.textContent = currentXP.toLocaleString();
xpText.textContent = `${currentXP} / ${xpNeededForNextLevel} XP`;
xpFill.style.width = `${Math.min((currentXP / xpNeededForNextLevel) * 100, 100)}%`;

const nextVault = vaultPacks.find(pack => pack.level > currentLevel);
nextRewardText.textContent = nextVault
    ? `${nextVault.name.replace(" Vault", "")} · Lvl ${nextVault.level}`
    : "Complete";

function renderVaultPacks() {
    const targetVault = vaultPacks.find(pack => pack.level > currentLevel) || vaultPacks[vaultPacks.length - 1];

    vaultTrack.innerHTML = vaultPacks.map(pack => {
        const unlocked = currentLevel >= pack.level;
        const active = pack.level === targetVault.level;

        return `
            <article class="vault-pack-card ${active ? "active" : ""}" data-level="${pack.level}">
                <div class="pack-level">Level</div>
                <div class="pack-number">${pack.level}</div>
                <div class="pack-art">
    <img src="${pack.image}" alt="${pack.name}">
</div>
                <h3>${pack.name}</h3>
                <p>${pack.items.length} items</p>
                <button class="pack-status">${unlocked ? "View Rewards" : "Locked"}</button>
            </article>
        `;
    }).join("");

    renderPreview(targetVault);
    addVaultCardClicks();
}

function renderPreview(pack) {
    const levelsRemaining = Math.max(pack.level - currentLevel, 0);

    previewPanel.innerHTML = `
        <h3>${pack.name}</h3>
        <p>${levelsRemaining === 0
            ? "Unlocked. Preview the rewards inside this Vault."
            : `Reach Level ${pack.level} to unlock. ${levelsRemaining} level${levelsRemaining === 1 ? "" : "s"} remaining.`
        }</p>

        <div class="preview-items">
            ${pack.items.map(item => `
                <div class="preview-item">
                    <div class="preview-icon">${getItemIcon(item[0])}</div>
                    <div class="preview-name">${item[1]}</div>
                    <div class="preview-type">${item[0]}</div>
                </div>
            `).join("")}
        </div>
    `;
}

function getItemIcon(type) {
    if (type === "Avatar") return "◉";
    if (type === "Banner") return "▰";
    if (type === "Frame") return "◇";
    if (type === "Badge") return "⬟";
    if (type === "Title") return "T";
    return "◆";
}

function addVaultCardClicks() {
    document.querySelectorAll(".vault-pack-card").forEach(card => {
        card.addEventListener("click", () => {
            const selectedLevel = Number(card.dataset.level);
            const selectedPack = vaultPacks.find(pack => pack.level === selectedLevel);

            document.querySelectorAll(".vault-pack-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            renderPreview(selectedPack);
        });
    });
}

renderVaultPacks();