const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const notificationBell = document.getElementById("notificationBell");
const notificationCount = document.getElementById("notificationCount");
const homeProfileCard = document.getElementById("homeProfileCard");

const dailyRewardPopup = document.getElementById("dailyRewardPopup");
const dailyRewardStreak = document.getElementById("dailyRewardStreak");
const dailyRewardAmount = document.getElementById("dailyRewardAmount");

function showDailyRewardPopup(streak, reward) {
    if (!dailyRewardPopup) return;

    dailyRewardStreak.textContent = streak;
    dailyRewardAmount.textContent = reward;

    dailyRewardPopup.classList.remove("hidden");

    setTimeout(function () {
        dailyRewardPopup.classList.add("hidden");
    }, 4000);
}

if (dailyRewardPopup) {
    dailyRewardPopup.addEventListener("click", function () {
        dailyRewardPopup.classList.add("hidden");
    });
}

function loadHomeProfile() {
    if (!homeProfileCard) return;

    loadPlayerProfile(username)
        .then(function (profile) {
            localStorage.setItem("profilePicture", profile.avatar);
            localStorage.setItem("profileBanner", profile.banner);
            localStorage.setItem("level", profile.level);
            localStorage.setItem("xp", profile.xp);

            renderHomeProfileCard(homeProfileCard, profile);
        })
        .catch(function (error) {
            console.log("HOME PROFILE LOAD ERROR:", error);

            const fallbackProfile = normalizePlayerProfile({
                username: username,
                profile_picture: localStorage.getItem("profilePicture") || "avatar1",
                profile_banner: localStorage.getItem("profileBanner") || "banner1",
                level: localStorage.getItem("level") || 1,
                xp: localStorage.getItem("xp") || 0,
                balance: localStorage.getItem("balance") || 0
            });

            renderHomeProfileCard(homeProfileCard, fallbackProfile);
        });
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
        window.location.href = "../clash/match-board.html";
    });
}

const menuToggle = document.getElementById("menuToggle");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const profileBtn = document.getElementById("profileBtn");
const friendsBtn = document.getElementById("friendsBtn");

function openMenu() {
    if (sideMenu) sideMenu.classList.add("open");
    if (menuOverlay) menuOverlay.classList.add("open");
}

function closeMenu() {
    if (sideMenu) sideMenu.classList.remove("open");
    if (menuOverlay) menuOverlay.classList.remove("open");
}

if (menuToggle) {
    menuToggle.addEventListener("click", openMenu);
}

if (menuOverlay) {
    menuOverlay.addEventListener("click", closeMenu);
}

if (profileBtn) {
    profileBtn.addEventListener("click", function () {
        window.location.href =
            "profile.html?user=" + encodeURIComponent(username);
    });
}

if (friendsBtn) {
    friendsBtn.addEventListener("click", function () {
        window.location.href = "friends.html";
    });
}

function logout() {
    localStorage.removeItem("authToken");
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

function loadNotificationCount() {
    if (!username || !notificationCount) return;

    Promise.all([
        apiFetch("/api/friends/requests/" + encodeURIComponent(username)),
        apiFetch("/api/friends/challenges/" + encodeURIComponent(username))
    ])
        .then(function (results) {
            const requestData = results[0];
            const challengeData = results[1];

            const requestCount =
                requestData.success && requestData.requests
                    ? requestData.requests.length
                    : 0;

            const challengeCount =
                challengeData.success && challengeData.challenges
                    ? challengeData.challenges.length
                    : 0;

            const totalCount = requestCount + challengeCount;

            if (totalCount > 0) {
                notificationCount.textContent = totalCount;
                notificationCount.classList.remove("hidden");
            } else {
                notificationCount.classList.add("hidden");
            }
        })
        .catch(function (error) {
            console.log("NOTIFICATION COUNT ERROR:", error);
        });
}

if (notificationBell) {
    notificationBell.addEventListener("click", function () {
        window.location.href = "notifications.html";
    });
}

function sendHeartbeat() {
    if (!username) return;

    apiFetch("/api/users/heartbeat", {
        method: "POST",
        body: JSON.stringify({})
    })
    .catch(function (error) {
        console.log("HEARTBEAT ERROR:", error);
    });
}

function claimDailyReward() {
    if (!username) return;

    apiFetch("/api/users/daily-reward", {
        method: "POST",
        body: JSON.stringify({})
    })
    .then(function (data) {
        if (!data.success || data.alreadyClaimed) return;

        localStorage.setItem("balance", data.balance);

        showDailyRewardPopup(data.streak, data.reward);

        loadHomeProfile();
    })
    .catch(function (error) {
        console.log("DAILY REWARD ERROR:", error);
    });
}

const leaderboardCard = document.getElementById("leaderboardCard");

if (leaderboardCard) {
    leaderboardCard.addEventListener("click", function () {
        window.location.href = "leaderboard.html";
    });
}

const vaultHomeBanner = document.getElementById("vaultHomeBanner");

if (vaultHomeBanner) {
    vaultHomeBanner.addEventListener("click", function () {
        window.location.href = "../Vault/vault.html";
    });
}
const activeTournamentBanner =
    document.getElementById("activeTournamentBanner");

const returnTournamentBtn =
    document.getElementById("returnTournamentBtn");

function clearSavedTournament() {
    const savedTournamentId =
        localStorage.getItem("currentTournamentId");

    if (savedTournamentId) {
        localStorage.removeItem(
            "completedTournament_" + savedTournamentId
        );

        localStorage.removeItem(
            "advancedTournamentMatch_" + savedTournamentId
        );
    }

    localStorage.removeItem("currentTournamentId");
    localStorage.removeItem("currentTournamentMatchId");
    localStorage.removeItem("lastTournamentChampion");
}

function loadActiveTournament() {
    const savedTournamentId =
        localStorage.getItem("currentTournamentId");

    if (!savedTournamentId || !activeTournamentBanner) {
        return;
    }

    apiFetch("/api/tournaments/" + encodeURIComponent(savedTournamentId))
        .then(function (data) {
            if (
                !data.success ||
                !data.tournament
            ) {
                clearSavedTournament();
                return;
            }

            const isParticipant = (data.players || []).some(function (player) {
                return player.username === username;
            });

            if (!isParticipant) {
                clearSavedTournament();
                return;
            }

            if (data.tournament.status === "Cancelled") {
                clearSavedTournament();
                return;
            }

            activeTournamentBanner.classList.remove("hidden");
        })
        .catch(function (error) {
            console.log("ACTIVE TOURNAMENT LOAD ERROR:", error);
        });
}

if (returnTournamentBtn) {
    returnTournamentBtn.addEventListener("click", function () {
        window.location.href =
            "../clash/tournament-room.html";
    });
}
loadHomeProfile();
loadNotificationCount();
sendHeartbeat();
loadActiveTournament();
claimDailyReward();

setInterval(loadNotificationCount, 15000);
setInterval(sendHeartbeat, 30000);