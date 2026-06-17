const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const usernameDisplay = document.getElementById("usernameDisplay");
const bannerPreview = document.getElementById("bannerPreview");
const avatarPreview = document.getElementById("avatarPreview");

const avatarButtons = document.querySelectorAll(".avatar-option");
const bannerButtons = document.querySelectorAll(".banner-option");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const skipProfileBtn = document.getElementById("skipProfileBtn");

let selectedAvatar = localStorage.getItem("profilePicture") || "avatar1";
let selectedBanner = localStorage.getItem("profileBanner") || "banner1";

if (usernameDisplay) {
    usernameDisplay.textContent = username;
}

function updateProfilePreview() {
    avatarPreview.src = "../assets/profile/" + selectedAvatar + ".png";
    bannerPreview.src = "../assets/profile/" + selectedBanner + ".png";

    avatarButtons.forEach(function (button) {
        button.classList.toggle("selected", button.dataset.avatar === selectedAvatar);
    });

    bannerButtons.forEach(function (button) {
        button.classList.toggle("selected", button.dataset.banner === selectedBanner);
    });
}

function saveProfile(profileCompleted) {
    saveProfileBtn.textContent = "SAVING...";
    saveProfileBtn.disabled = true;
    skipProfileBtn.disabled = true;

    fetch("https://api.pryzepot.com/api/users/save-profile", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            profilePicture: selectedAvatar,
            profileBanner: selectedBanner,
            profileCompleted: profileCompleted
        })
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

        localStorage.setItem("profilePicture", data.user.profile_picture || selectedAvatar);
        localStorage.setItem("profileBanner", data.user.profile_banner || selectedBanner);
        localStorage.setItem("profileCompleted", String(data.user.profile_completed));

        localStorage.setItem("xp", data.user.xp || 0);
        localStorage.setItem("level", data.user.level || 1);

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

avatarButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectedAvatar = button.dataset.avatar;
        updateProfilePreview();
    });
});

bannerButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectedBanner = button.dataset.banner;
        updateProfilePreview();
    });
});

saveProfileBtn.addEventListener("click", function () {
    saveProfile(true);
});

skipProfileBtn.addEventListener("click", function () {
    selectedAvatar = "avatar1";
    selectedBanner = "banner1";

    localStorage.setItem("profilePicture", "avatar1");
    localStorage.setItem("profileBanner", "banner1");
    localStorage.setItem("profileCompleted", "false");

    saveProfile(false);
});

updateProfilePreview();