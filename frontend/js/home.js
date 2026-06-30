const username = localStorage.getItem("username");
const balance = localStorage.getItem("balance");
const level = localStorage.getItem("level") || "1";
const profilePicture = localStorage.getItem("profilePicture") || "avatar1";
const profileBanner = localStorage.getItem("profileBanner") || "banner1";

if (!username) {
    window.location.href = "index.html";
}

const usernameDisplay = document.getElementById("usernameDisplay");
const balanceDisplay = document.getElementById("balanceDisplay");
const levelDisplay = document.getElementById("levelDisplay");

const xpDisplay = document.getElementById("xpDisplay");
const nextLevelDisplay = document.getElementById("nextLevelDisplay");
const xpFill = document.getElementById("xpFill");

const homeAvatarImage = document.getElementById("homeAvatarImage");
const homeBannerImage = document.getElementById("homeBannerImage");

if (usernameDisplay) usernameDisplay.textContent = username;
if (balanceDisplay) balanceDisplay.textContent = balance || "0";
if (levelDisplay) levelDisplay.textContent = "Level " + level;

if (homeAvatarImage) {
    homeAvatarImage.src = "../assets/profile/" + profilePicture + ".png";
}

if (homeBannerImage) {
    homeBannerImage.src = "../assets/profile/" + profileBanner + ".png";
}

function updateXpBar(user) {
    const xpProgress = user.xp_progress;

    if (!xpProgress) {
        return;
    }

    if (xpFill) {
        xpFill.style.width = xpProgress.progress_percent + "%";
    }

    if (xpDisplay) {
        xpDisplay.textContent =
            xpProgress.current_xp + " / " + xpProgress.next_level_xp + " XP";
    }

    if (nextLevelDisplay) {
        nextLevelDisplay.textContent =
            "Lvl " + xpProgress.next_level;
    }
}

fetch("https://api.pryzepot.com/api/users/" + username + "/profile")
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (!data.success || !data.user) return;

        const user = data.user;

        const savedAvatar = user.profile_picture || "avatar1";
        const savedBanner = user.profile_banner || "banner1";
        const savedLevel = user.level || 1;
        const savedXp = user.xp || 0;

        localStorage.setItem("profilePicture", savedAvatar);
        localStorage.setItem("profileBanner", savedBanner);
        localStorage.setItem("profileCompleted", String(user.profile_completed || false));
        localStorage.setItem("level", savedLevel);
        localStorage.setItem("xp", savedXp);

        if (homeAvatarImage) {
            homeAvatarImage.src = "../assets/profile/" + savedAvatar + ".png";
        }

        if (homeBannerImage) {
            homeBannerImage.src = "../assets/profile/" + savedBanner + ".png";
        }

        if (levelDisplay) {
            levelDisplay.textContent = "Level " + savedLevel;
        }

        updateXpBar(user);
    })
    .catch(function (error) {
        console.log("HOME PROFILE LOAD ERROR:", error);
    });

const clashPlayBtn = document.getElementById("clashPlayBtn");

if (clashPlayBtn) {
    clashPlayBtn.addEventListener("click", function () {
        window.location.href = "../clash/online.html";
    });
}

const joinTournamentBtn = document.getElementById("joinTournamentBtn");

if (joinTournamentBtn) {
    joinTournamentBtn.addEventListener("click", function () {
        window.location.href = "../clash/online.html";
    });
}

const menuToggle = document.getElementById("menuToggle");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const profileBtn = document.getElementById("profileBtn");

function openMenu() {
    sideMenu.classList.add("open");
    menuOverlay.classList.add("open");
}

function closeMenu() {
    sideMenu.classList.remove("open");
    menuOverlay.classList.remove("open");
}

if (menuToggle) {
    menuToggle.addEventListener("click", openMenu);
}

if (menuOverlay) {
    menuOverlay.addEventListener("click", closeMenu);
}

if (profileBtn) {
    profileBtn.addEventListener("click", function () {
        window.location.href = "profile-setup.html";
    });
}

function logout() {
    localStorage.removeItem("username");
    localStorage.removeItem("balance");

    localStorage.removeItem("profilePicture");
    localStorage.removeItem("profileBanner");
    localStorage.removeItem("profileCompleted");
    localStorage.removeItem("xp");
    localStorage.removeItem("level");

    localStorage.removeItem("clashPlayerTag");
    localStorage.removeItem("clashPlayerName");
    localStorage.removeItem("clashTrophies");
    localStorage.removeItem("clashExpLevel");
    localStorage.removeItem("clashFriendLink");

    localStorage.removeItem("entryFee");
    localStorage.removeItem("currentMatchId");
    localStorage.removeItem("matchResult");
    localStorage.removeItem("rulesAccepted");

    window.location.href = "index.html";
}

const logoutBtn = document.getElementById("logoutBtn");
const menuLogoutBtn = document.getElementById("menuLogoutBtn");

if (logoutBtn) logoutBtn.addEventListener("click", logout);
if (menuLogoutBtn) menuLogoutBtn.addEventListener("click", logout);