const backButton = document.getElementById("backButton");
const currentLevelText = document.getElementById("currentLevel");
const xpAmount = document.getElementById("xpAmount");
const xpText = document.getElementById("xpText");
const xpFill = document.getElementById("xpFill");
const creditsAmount = document.getElementById("creditsAmount");
const vaultTrack = document.getElementById("vaultTrack");
const previewPanel = document.getElementById("previewPanel");

const username = localStorage.getItem("username");

const TIER_RARITY = {
    recruit: "common",
    contender: "rare",
    elite: "epic",
    champion: "legendary",
    master: "master",
    legend: "legend"
};

const GROUP_ORDER = ["Avatar", "Banner", "Frame", "Badge", "Title"];
const GROUP_LABEL = {
    Avatar: "Avatars",
    Banner: "Banners",
    Frame: "Frames",
    Badge: "Badges",
    Title: "Titles"
};

let vaultTiers = [];
let ownedCosmeticIds = new Set();
let currentBalance = 0;
let activeTierKey = null;
let firstCreditsRender = true;

function normalizeVaultImagePath(image) {
    if (!image) return "";

    if (image.startsWith("../")) return image;

    if (image.startsWith("assets/")) return "../" + image;

    if (image.includes("/")) return "../" + image;

    return image;
}

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "../html/home.html";
    });
}

function formatMoney(value) {
    return '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + Number(value || 0).toLocaleString();
}

function updateCreditsDisplay() {
    creditsAmount.innerHTML = formatMoney(currentBalance);

    if (!firstCreditsRender) {
        creditsAmount.classList.remove("credits-flash");
        void creditsAmount.offsetWidth;
        creditsAmount.classList.add("credits-flash");
    }

    firstCreditsRender = false;
}

function getItemIcon(type) {
    if (type === "Avatar") return "◉";
    if (type === "Banner") return "▰";
    if (type === "Frame") return "◇";
    if (type === "Badge") return "⬟";
    if (type === "Title") return "T";

    return "◆";
}

function renderTitlePreview(item, type, name, rarity) {
    if (type === "Title") {
        return `<span class="title-preview ${rarity || "common"}">${name}</span>`;
    }

    return getItemIcon(type);
}

function renderVaultTiers() {
    const targetTier =
        vaultTiers.find(function (tier) {
            return tier.key === activeTierKey;
        }) || vaultTiers[0];

    vaultTrack.innerHTML = vaultTiers.map(function (tier, index) {
        const ownedCount = tier.items.filter(function (item) {
            return ownedCosmeticIds.has(item.id);
        }).length;
        const allOwned = ownedCount === tier.items.length;
        const active = targetTier && tier.key === targetTier.key;

        return `
            <article class="vault-pack-card ${active ? "active" : ""}" data-key="${tier.key}" style="animation-delay:${index * 55}ms">
                <div class="pack-price">${formatMoney(tier.price)}</div>

                <div class="pack-art">
                    <img src="${normalizeVaultImagePath(tier.image)}" alt="${tier.name}">
                </div>

                <h3>${tier.name}</h3>
                <p>${ownedCount}/${tier.items.length} owned</p>

                <button class="pack-status ${allOwned ? "owned" : ""}">
                    ${allOwned ? "Owned" : "View & Buy"}
                </button>
            </article>
        `;
    }).join("");

    if (targetTier) {
        renderPreview(targetTier);
    }

    addVaultCardClicks();
}

function renderPreview(tier) {
    activeTierKey = tier.key;
    const rarity = TIER_RARITY[tier.key];

    const groups = {};
    tier.items.forEach(function (item) {
        groups[item.type] = groups[item.type] || [];
        groups[item.type].push(item);
    });

    let itemIndex = 0;

    const groupsHtml = GROUP_ORDER.filter(function (type) {
        return groups[type];
    }).map(function (type) {
        const items = groups[type];

        const itemsHtml = items.map(function (item) {
            const owned = ownedCosmeticIds.has(item.id);
            const delay = itemIndex * 45;
            itemIndex += 1;

            return `
                <div class="preview-item" data-cosmetic-id="${item.id}" style="animation-delay:${delay}ms">
                    <div class="preview-icon">
                        ${item.image
                            ? `<img src="${normalizeVaultImagePath(item.image)}" alt="${item.name}">`
                            : renderTitlePreview(item, item.type, item.name, rarity)
                        }
                    </div>

                    <div class="preview-name">${item.name}</div>

                    ${owned
                        ? `<div class="item-owned-badge">Owned</div>`
                        : `<button class="item-buy-btn" data-item-id="${item.id}">${formatMoney(tier.price)}</button>`
                    }
                </div>
            `;
        }).join("");

        return `
            <div class="item-group">
                <div class="item-group-label">${GROUP_LABEL[type]} <span>${items.length}</span></div>
                <div class="preview-items">${itemsHtml}</div>
            </div>
        `;
    }).join("");

    previewPanel.innerHTML = `
        <h3>${tier.name}</h3>

        <p>Every item in this Vault costs ${tier.price.toLocaleString()} Vault Credits.</p>

        ${groupsHtml}
    `;

    previewPanel.querySelectorAll(".item-buy-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            purchaseCosmetic(button.dataset.itemId, tier, button);
        });
    });
}

function swapPreview(tier) {
    previewPanel.classList.add("switching");

    setTimeout(function () {
        renderPreview(tier);
        previewPanel.classList.remove("switching");
    }, 140);
}

function addVaultCardClicks() {
    document.querySelectorAll(".vault-pack-card").forEach(function (card) {
        card.addEventListener("click", function () {
            const selectedKey = card.dataset.key;
            const selectedTier = vaultTiers.find(function (tier) {
                return tier.key === selectedKey;
            });

            document.querySelectorAll(".vault-pack-card").forEach(function (c) {
                c.classList.remove("active");
            });

            card.classList.add("active");

            if (selectedTier) {
                swapPreview(selectedTier);
            }
        });
    });
}

function flashButtonError(button, message) {
    const original = button.innerHTML;
    button.textContent = message;
    button.classList.add("shake");
    button.disabled = true;

    setTimeout(function () {
        button.classList.remove("shake");
        button.innerHTML = original;
        button.disabled = false;
    }, 1100);
}

function purchaseCosmetic(cosmeticId, tier, button) {
    if (button) {
        button.disabled = true;
    }

    apiFetch("/api/users/purchase-cosmetic", {
        method: "POST",
        body: JSON.stringify({ cosmeticId: cosmeticId })
    }).then(function (data) {
        if (!data.success) {
            if (button) {
                flashButtonError(button, data.message || "Purchase failed");
            }
            return;
        }

        ownedCosmeticIds.add(cosmeticId);
        currentBalance = data.balance;
        localStorage.setItem("balance", data.balance);
        updateCreditsDisplay();

        const card = previewPanel.querySelector('.preview-item[data-cosmetic-id="' + cosmeticId + '"]');
        if (card) {
            card.classList.add("just-bought");
        }

        renderVaultTiers();
    }).catch(function (error) {
        console.log("PURCHASE COSMETIC ERROR:", error);
        if (button) {
            flashButtonError(button, "Try again");
        }
    });
}

function init() {
    Promise.all([
        apiFetch("/api/vault/catalog"),
        apiFetch("/api/users/" + encodeURIComponent(username) + "/profile"),
        apiFetch("/api/users/" + encodeURIComponent(username) + "/cosmetics")
    ]).then(function (results) {
        const catalogData = results[0];
        const profileData = results[1];
        const cosmeticsData = results[2];

        vaultTiers = catalogData.tiers || [];

        const level = Number(profileData.level) || 1;
        const xp = Number(profileData.xp) || 0;
        const xpNeededForNextLevel = level * 100;

        currentLevelText.textContent = "Level " + level;
        xpAmount.textContent = xp.toLocaleString();
        xpText.textContent = xp + " / " + xpNeededForNextLevel + " XP";
        xpFill.style.width = Math.min((xp / xpNeededForNextLevel) * 100, 100) + "%";

        currentBalance = Number(profileData.balance) || 0;
        localStorage.setItem("balance", currentBalance);
        updateCreditsDisplay();

        const owned = (cosmeticsData.cosmetics || []).map(function (c) {
            return c.cosmetic_id;
        });
        ownedCosmeticIds = new Set(owned);

        renderVaultTiers();
    }).catch(function (error) {
        console.log("VAULT INIT ERROR:", error);
    });
}

init();
