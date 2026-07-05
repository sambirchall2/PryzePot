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
            { type: "Avatar", name: "Fireborn", image: "../assets/vault/avatars/fireborn.png" },
            { type: "Avatar", name: "Frostbite", image: "../assets/vault/avatars/frostbite.png" },
            { type: "Avatar", name: "Storm Face", image: "../assets/vault/avatars/storm-face.png" },
            { type: "Banner", name: "Inferno", image: "../assets/vault/banners/inferno.png" },
            { type: "Banner", name: "Ice Wall", image: "../assets/vault/banners/ice-wall.png" },
            { type: "Banner", name: "Dark Matter", image: "../assets/vault/banners/dark-matter.png" },
            { type: "Frame", name: "Bronze Edge", image: "../assets/vault/frames/bronze-edge-frame.png" },
            { type: "Title", name: "The Grinder", rarity: "common" },
            { type: "Badge", name: "Rising Player", image: "../assets/vault/badges/rising-player-badge.png" },
        ]
    },
    {
        level: 10,
        name: "Contender Vault",
        image: "../assets/vault/vaults/contender-vault.png",
        items: [
            { type: "Avatar", name: "Crown Core", image: "../assets/vault/avatars/crown-core.png" },
            { type: "Avatar", name: "Dragon Pulse", image: "../assets/vault/avatars/dragon-pulse.png" },
            { type: "Avatar", name: "Skull Shade", image: "../assets/vault/avatars/skull-shade.png" },
            { type: "Banner", name: "Lightning Run", image: "../assets/vault/banners/lightning-run.png" },
            { type: "Banner", name: "Neon Galaxy", image: "../assets/vault/banners/neon-galaxy.png" },
            { type: "Banner", name: "Lime Smoke", image: "../assets/vault/banners/lime-smoke.png" },
            { type: "Frame", name: "Silver Edge", image: "../assets/vault/frames/silver-edge-frame.png" },
            { type: "Title", name: "King Slayer", rarity: "rare" },
            { type: "Badge", name: "Veteran", image: "../assets/vault/badges/veteran-badge.png" },
            { type: "Badge", name: "Shield Mark", image: "../assets/vault/badges/shield-mark-badge.png" },
        ]
    },
    {
        level: 15,
        name: "Elite Vault",
        image: "../assets/vault/vaults/elite-vault.png",
        items: [
            { type: "Avatar", name: "Neon Wizard", image: "../assets/vault/avatars/neon-wizard.png" },
            { type: "Avatar", name: "Cyber Knight", image: "../assets/vault/avatars/cyber-knight.png" },
            { type: "Avatar", name: "Dark Mask", image: "../assets/vault/avatars/dark-mask.png" },
            { type: "Banner", name: "Green Fire", image: "../assets/vault/banners/green-fire.png" },
            { type: "Banner", name: "Battlefield", image: "../assets/vault/banners/battlefield.png" },
            { type: "Banner", name: "Crystal Core", image: "../assets/vault/banners/crystal-core.png" },
            { type: "Frame", name: "Gold Edge", image: "../assets/vault/frames/gold-edge-frame.png" },
            { type: "Title", name: "Elite Competitor", rarity: "epic" },
            { type: "Badge", name: "Winner", image: "../assets/vault/badges/winner-badge.png" },
        ]
    },
    {
        level: 20,
        name: "Champion Vault",
        image: "../assets/vault/vaults/champion-vault.png",
        items: [
            { type: "Avatar", name: "Inferno Dragon", image: "../assets/vault/avatars/inferno-dragon.png" },
            { type: "Avatar", name: "Royal Ghost", image: "../assets/vault/avatars/royal-ghost.png" },
            { type: "Avatar", name: "Void Reaper", image: "../assets/vault/avatars/void-reaper.png" },
            { type: "Banner", name: "Inferno Banner", image: "../assets/vault/banners/inferno-banner.png" },
            { type: "Banner", name: "Thunder Vault", image: "../assets/vault/banners/thunder-vault.png" },
            { type: "Banner", name: "Toxic Neon", image: "../assets/vault/banners/toxic-neon.png" },
            { type: "Frame", name: "Diamond Edge", image: "../assets/vault/frames/diamond-edge-frame.png" },
            { type: "Title", name: "Champion", rarity: "legendary" },
            { type: "Badge", name: "Champion Badge", image: "../assets/vault/badges/champion-badge.png" },
        ]
    },
    {
        level: 30,
        name: "Master Vault",
        image: "../assets/vault/vaults/master-vault.png",
        items: [
            { type: "Avatar", name: "Neon Wolf", image: "../assets/vault/avatars/neon-wolf.png" },
            { type: "Avatar", name: "Vault Guardian", image: "../assets/vault/avatars/vault-guardian.png" },
            { type: "Avatar", name: "Crown Phantom", image: "../assets/vault/avatars/crown-phantom.png" },
            { type: "Banner", name: "Master Galaxy", image: "../assets/vault/banners/master-galaxy.png" },
            { type: "Banner", name: "Crown Flame", image: "../assets/vault/banners/crown-flame.png" },
            { type: "Banner", name: "Overcharge", image: "../assets/vault/banners/overcharge.png" },
            { type: "Frame", name: "Master Frame", image: "../assets/vault/frames/master-frame.png" },
            { type: "Title", name: "Master", rarity: "master" },
            { type: "Badge", name: "Master Badge", image: "../assets/vault/badges/master-badge.png" },
        ]
    },
    {
        level: 50,
        name: "Legend Vault",
        image: "../assets/vault/vaults/legend-vault.png",
        items: [
            { type: "Avatar", name: "Legend Crown", image: "../assets/vault/avatars/legend-crown.png" },
            { type: "Avatar", name: "Ancient Dragon", image: "../assets/vault/avatars/ancient-dragon.png" },
            { type: "Avatar", name: "Final Boss", image: "../assets/vault/avatars/final-boss.png" },
            { type: "Banner", name: "Hall of Legends", image: "../assets/vault/banners/hall-of-legends.png" },
            { type: "Banner", name: "Eternal Flame", image: "../assets/vault/banners/eternal-flame.png" },
            { type: "Banner", name: "God Spark", image: "../assets/vault/banners/god-spark.png" },
            { type: "Frame", name: "Legend Frame", image: "../assets/vault/frames/legend-frame.png" },
            { type: "Title", name: "Pryze Legend", rarity: "legend" },
            { type: "Badge", name: "Legend Badge", image: "../assets/vault/badges/legend-badge.png" },
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
            ${pack.items.map(item => {
    const type = item.type || item[0];
    const name = item.name || item[1];
    const image = item.image;

    return `
        <div class="preview-item">
            <div class="preview-icon">
                ${image ? `<img src="${image}" alt="${name}">` : renderTitlePreview(item, type, name)}
            </div>
            <div class="preview-name">${name}</div>
            <div class="preview-type">${type}</div>
        </div>
    `;
}).join("")}
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
function renderTitlePreview(item, type, name) {
    if (type === "Title") {
        return `<span class="title-preview ${item.rarity || "common"}">${name}</span>`;
    }

    return getItemIcon(type);
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