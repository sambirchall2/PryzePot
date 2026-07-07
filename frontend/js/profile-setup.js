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
const framePreview = document.getElementById("framePreview");
const badgePreview = document.getElementById("badgePreview");

let unlockedCosmetics = [];

let selectedAvatar = null;
let selectedBanner = null;
let selectedFrame = null;
let selectedBadge = null;
let selectedTitle = null;

if (usernameDisplay) {
    usernameDisplay.textContent = username;
}

function normalizeImagePath(path, type) {
    if (!path) return "";

    if (path.startsWith("../")) return path;
    if (path.startsWith("assets/")) return "../" + path;

    if (type === "Avatar" && path.startsWith("avatar")) {
        return "../assets/profile/" + path + ".png";
    }

    if (type === "Banner" && path.startsWith("banner")) {
        return "../assets/profile/" + path + ".png";
    }

    if (type === "Avatar") return "../assets/vault/avatars/" + path + ".png";
    if (type === "Banner") return "../assets/vault/banners/" + path + ".png";
    if (type === "Frame") return "../assets/vault/frames/" + path + ".png";
    if (type === "Badge") return "../assets/vault/badges/" + path + ".png";

    return "../assets/profile/" + path + ".png";
}

function updateProfilePreview() {
    if (selectedAvatar && avatarPreview) {
        avatarPreview.src = normalizeImagePath(selectedAvatar.cosmetic_image || selectedAvatar.cosmetic_id, selectedAvatar.cosmetic_type);
    }

    if (selectedBanner && bannerPreview) {
        bannerPreview.src = normalizeImagePath(selectedBanner.cosmetic_image || selectedBanner.cosmetic_id, selectedBanner.cosmetic_type);
    }
if (selectedFrame && framePreview) {
    framePreview.src = normalizeImagePath(
        selectedFrame.cosmetic_image || selectedFrame.cosmetic_id,
        selectedFrame.cosmetic_type
    );
    framePreview.classList.remove("hidden");
} else if (framePreview) {
    framePreview.classList.add("hidden");
}

if (selectedBadge && badgePreview) {
    badgePreview.src = normalizeImagePath(
        selectedBadge.cosmetic_image || selectedBadge.cosmetic_id,
        selectedBadge.cosmetic_type
    );
    badgePreview.classList.remove("hidden");
} else if (badgePreview) {
    badgePreview.classList.add("hidden");
}

if (selectedTitle && titlePreview) {
    titlePreview.textContent = selectedTitle.cosmetic_name;
} else if (titlePreview) {
    titlePreview.textContent = "Level " + (localStorage.getItem("level") || "1");
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
            <img src="${normalizeImagePath(cosmetic.cosmetic_image || cosmetic.cosmetic_id, cosmetic.cosmetic_type)}" alt="${cosmetic.cosmetic_name}">
        `;
    }

    button.addEventListener("click", function () {
        if (cosmetic.cosmetic_type === "Avatar") selectedAvatar = cosmetic;
        if (cosmetic.cosmetic_type === "Banner") selectedBanner = cosmetic;
        if (cosmetic.cosmetic_type === "Frame") {
    selectedFrame =
        selectedFrame && selectedFrame.cosmetic_id === cosmetic.cosmetic_id
            ? null
            : cosmetic;
}

if (cosmetic.cosmetic_type === "Badge") {
    selectedBadge =
        selectedBadge && selectedBadge.cosmetic_id === cosmetic.cosmetic_id
            ? null
            : cosmetic;
}

if (cosmetic.cosmetic_type === "Title") {
    selectedTitle =
        selectedTitle && selectedTitle.cosmetic_id === cosmetic.cosmetic_id
            ? null
            : cosmetic;
}

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
    // ---------- Starter Avatars ----------
for (let i = 1; i <= 6; i++) {

    const button = document.createElement("button");
    button.className = "avatar-option cosmetic-option";
    button.dataset.cosmeticId = "avatar" + i;

    button.innerHTML =
        '<img src="../assets/profile/avatar' + i + '.png">';

    button.addEventListener("click", function () {

        selectedAvatar = {
            cosmetic_id: "avatar" + i,
            cosmetic_type: "Avatar",
            cosmetic_image: "avatar" + i
        };

        updateProfilePreview();

    });

    avatarOptions.appendChild(button);

}


// ---------- Starter Banners ----------
for (let i = 1; i <= 6; i++) {

    const button = document.createElement("button");
    button.className = "banner-option cosmetic-option";
    button.dataset.cosmeticId = "banner" + i;

    button.innerHTML =
        '<img src="../assets/profile/banner' + i + '.png">';

    button.addEventListener("click", function () {

        selectedBanner = {
            cosmetic_id: "banner" + i,
            cosmetic_type: "Banner",
            cosmetic_image: "banner" + i
        };

        updateProfilePreview();

    });

    bannerOptions.appendChild(button);

}

    unlockedCosmetics.forEach(function (cosmetic) {
        const button = createCosmeticButton(cosmetic);

        if (cosmetic.cosmetic_type === "Avatar") avatarOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Banner") bannerOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Frame") frameOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Badge") badgeOptions.appendChild(button);
        if (cosmetic.cosmetic_type === "Title") titleOptions.appendChild(button);
    });

    selectedAvatar = {
    cosmetic_id: localStorage.getItem("profilePicture") || "avatar1",
    cosmetic_type: "Avatar",
    cosmetic_image: localStorage.getItem("profilePicture") || "avatar1"
};

selectedBanner = {
    cosmetic_id: localStorage.getItem("profileBanner") || "banner1",
    cosmetic_type: "Banner",
    cosmetic_image: localStorage.getItem("profileBanner") || "banner1"
};

selectedFrame = null;
selectedBadge = null;
selectedTitle = null;

    updateProfilePreview();
}

function equipCosmetic(cosmetic) {
    if (!cosmetic) return Promise.resolve();

    const isStarterAvatar =
        cosmetic.cosmetic_type === "Avatar" &&
        cosmetic.cosmetic_id.startsWith("avatar");

    const isStarterBanner =
        cosmetic.cosmetic_type === "Banner" &&
        cosmetic.cosmetic_id.startsWith("banner");

    if (isStarterAvatar || isStarterBanner) {
        return Promise.resolve({
            success: true
        });
    }

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