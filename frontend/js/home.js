const username = localStorage.getItem("username");
const balance = localStorage.getItem("balance");
const level = localStorage.getItem("level") || "1";

if (!username) {
    window.location.href = "index.html";
}

const usernameDisplay = document.getElementById("usernameDisplay");
const balanceDisplay = document.getElementById("balanceDisplay");
const levelDisplay = document.getElementById("levelDisplay");

if (usernameDisplay) {
    usernameDisplay.textContent = username;
}

if (balanceDisplay) {
    balanceDisplay.textContent = balance || "0";
}

if (levelDisplay) {
    levelDisplay.textContent = "Level " + level;
}

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

if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
}

if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener("click", logout);
}