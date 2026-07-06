const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const usernameDisplay = document.getElementById("usernameDisplay");
const bannerPreview = document.getElementById("bannerPreview");
const avatarPreview = document.getElementById("avatarPreview");
const titlePreview = document.getElementById("titlePreview");

const avatarOptions = document.getElementById("avatarOptions");
const bannerOptions = document.getElementById("bannerOptions");
const frameOptions = document.getElementById("frameOptions");
const badgeOptions = document.getElementById("badgeOptions");
const titleOptions = document.getElementById("titleOptions");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const skipProfileBtn = document.getElementById("skipProfileBtn");

let unlockedCosmetics = [];

let selectedAvatar = null;
let selectedBanner = null;
let selectedFrame = null;
let selectedBadge = null;
let selectedTitle = null;

if (usernameDisplay) {
    usernameDisplay.textContent = username;
}

function normalizeImagePath(path) {
    if (!path) return "";

    if (path.startsWith("../")) {
        return path;
    }

    if (path.startsWith("assets/")) {
        return "../" + path;
    }

    return "../assets/profile/" + path + ".png";
}

function updateProfilePreview() {
    if (selectedAvatar && avatarPreview) {
        avatarPreview.src = normalizeImagePath(selectedAvatar.cosmetic_image || selectedAvatar.cosmetic_id);
    }

    if (selectedBanner && bannerPreview) {
        bannerPreview.src = normalizeImagePath(selectedBanner.cosmetic_image || selectedBanner.cosmetic_id);
    }

    if (selectedTitle && titlePreview) {
        titlePreview.textContent = selectedTitle.cosmetic_name;
    }

    document.querySelectorAll(".cosmetic-option").forEach(function (button) {
        button.classList.remove("selected");
    });

    if (selectedAvatar) selectButton(selectedAvatar.cosmetic_id);
    if (selectedBanner) selectButton(selectedBanner.cosmetic_id);
    if (selectedFrame) selectButton(selectedFrame.cosmetic_id);
    if (selectedBadge) selectButton(selectedBadge.cosmetic_id);
    if (selectedTitle) selectButton(selectedTitle.cosmetic_id);
}

function selectButton(cosmeticId) {
    const button = document.querySelector('[data-cosmetic-id="' + cosmeticId + '"]');

    if (button) {
        button.classList.add("selected");
    }
}

function createCosmeticButton(cosmetic) {
    const button = document.createElement("button");
    button.className = "cosmetic-option";
    button.dataset.cosmeticId = cosmetic.cosmetic_id;

    if (cosmetic.cosmetic_type === "Banner" || cosmetic.cosmetic_type === "Title") {
        button.classList.add("banner-option");
    } else {
        button.classList.add("avatar-option");
    }

    if (cosmetic.cosmetic_type === "Title") {
        button.innerHTML = `
            <div class="cosmetic-title-pill">${cosmetic.cosmetic_name}</div>
        `;
    } else {
        button.innerHTML = `
            <img src="${normalizeImagePath(cosmetic.cosmetic_image)}" alt="${cosmetic.cosmetic_name}">
        `;
    }

    button.addEventListener("click", function () {
        if (cosmetic.cosmetic_type === "Avatar") selectedAvatar = cosmetic;
        if (cosmetic.cosmetic_type === "Banner") selectedBanner = cosmetic;
        if (cosmetic.cosmetic_type === "Frame") selectedFrame = cosmetic;
        if (cosmetic.cosmetic_type === "Badge") selectedBadge = cosmetic;
        if (cosmetic.cosmetic_type === "Title") selectedTitle = cosmetic;

        updateProfilePreview();
    });

    return button;
}

function renderCosmetics() {
    avatarOptions.innerHTML = "";
    bannerOptions.innerHTML = "";
    frameOptions.innerHTML = "";
    badgeOptions.innerHTML = "";
    titleOptions.innerHTML = "";

    unlockedCosmetics.forEach(function (cosmetic) {
        const button = createCosmeticButton(cosmetic);

        if (cosmetic.cosmetic_type === "Avatar") avatarOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Banner") bannerOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Frame") frameOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Badge") badgeOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Title") titleOptions.appendChild(button);
    });

    selectedAvatar = unlockedCosmetics.find(c => c.cosmetic_type === "Avatar") || null;
    selectedBanner = unlockedCosmetics.find(c => c.cosmetic_type === "Banner") || null;
    selectedFrame = unlockedCosmetics.find(c => c.cosmetic_type === "Frame") || null;
    selectedBadge = unlockedCosmetics.find(c => c.cosmetic_type === "Badge") || null;
    selectedTitle = unlockedCosmetics.find(c => c.cosmetic_type === "Title") || null;

    updateProfilePreview();
}

function equipCosmetic(cosmetic) {
    if (!cosmetic) return Promise.resolve();

    return fetch("https://api.pryzepot.com/api/users/equip-cosmetic", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            cosmeticType: cosmetic.cosmetic_type,
            cosmeticId: cosmetic.cosmetic_id
        })
    }).then(function (response) {
        return response.json();
    });
}

function saveProfile(profileCompleted) {
    saveProfileBtn.textContent = "SAVING...";
    saveProfileBtn.disabled = true;
    skipProfileBtn.disabled = true;

    Promise.all([
        equipCosmetic(selectedAvatar),
        equipCosmetic(selectedBanner),
        equipCosmetic(selectedFrame),
        equipCosmetic(selectedBadge),
        equipCosmetic(selectedTitle)
    ])
    .then(function () {
        return fetch("https://api.pryzepot.com/api/users/save-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                profilePicture: selectedAvatar ? selectedAvatar.cosmetic_id : "avatar1",
                profileBanner: selectedBanner ? selectedBanner.cosmetic_id : "banner1",
                profileCompleted: profileCompleted
            })
        });
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (!data.success) {
            alert(data.message || "Could not save profile.");
            saveProfileBtn.textContent = "SAVE PROFILE";
            saveProfileBtn.disabled = false;
            skipProfileBtn.disabled = false;
            return;
        }

        window.location.href = "home.html";
    })
    .catch(function (error) {
        console.log("SAVE PROFILE ERROR:", error);
        alert("Something went wrong saving your profile.");

        saveProfileBtn.textContent = "SAVE PROFILE";
        saveProfileBtn.disabled = false;
        skipProfileBtn.disabled = false;
    });
}

function loadUnlockedCosmetics() {
    fetch("https://api.pryzepot.com/api/users/" + encodeURIComponent(username) + "/cosmetics")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success) {
                alert(data.message || "Could not load cosmetics.");
                return;
            }

            unlockedCosmetics = data.cosmetics || [];

            if (unlockedCosmetics.length === 0) {
                alert("No Vault cosmetics unlocked yet. Log out and back in once, then try again.");
            }

            renderCosmetics();
        })
        .catch(function (error) {
            console.log("LOAD COSMETICS ERROR:", error);
            alert("Could not load unlocked cosmetics.");
        });
}

saveProfileBtn.addEventListener("click", function () {
    saveProfile(true);
});

skipProfileBtn.addEventListener("click", function () {
    window.location.href = "home.html";
});

loadUnlockedCosmetics();