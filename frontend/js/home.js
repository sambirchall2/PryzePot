const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const notificationBell = document.getElementById("notificationBell");
const notificationCount = document.getElementById("notificationCount");
const homeProfileCard = document.getElementById("homeProfileCard");
const friendsShortcut = document.getElementById("friendsShortcut");
const onlineFriendsCount = document.getElementById("onlineFriendsCount");
const friendRequestBadge = document.getElementById("friendRequestBadge");

function isFriendOnline(lastSeen) {
    if (!lastSeen) return false;

    return (Date.now() - Number(lastSeen)) < 90000;
}

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

const chessPlayBtn = document.getElementById("chessPlayBtn");

if (chessPlayBtn) {
    chessPlayBtn.addEventListener("click", function () {
        window.location.href = "../chess/online.html";
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
const vaultBtn = document.getElementById("vaultBtn");
const settingsBtn = document.getElementById("settingsBtn");

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

if (vaultBtn) {
    vaultBtn.addEventListener("click", function () {
        window.location.href = "../Vault/vault.html";
    });
}

if (settingsBtn) {
    settingsBtn.addEventListener("click", function () {
        window.location.href = "settings.html";
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
    localStorage.removeItem("clashFriendLinkSetAt");
    localStorage.removeItem("chessUsername");
    localStorage.removeItem("chessName");
    localStorage.removeItem("chessRating");
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

            if (friendRequestBadge) {
                if (requestCount > 0) {
                    friendRequestBadge.textContent = requestCount;
                    friendRequestBadge.classList.remove("hidden");
                } else {
                    friendRequestBadge.classList.add("hidden");
                }
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

function loadOnlineFriendsCount() {
    if (!username || !onlineFriendsCount) return;

    apiFetch("/api/friends/" + encodeURIComponent(username))
        .then(function (data) {
            if (!data.success || !data.friends || data.friends.length === 0) {
                onlineFriendsCount.classList.add("hidden");
                return;
            }

            return apiFetch("/api/users/profiles-batch", {
                method: "POST",
                body: JSON.stringify({ usernames: data.friends })
            }).then(function (batchResult) {
                const profiles = batchResult.profiles || {};

                const onlineCount = data.friends.filter(function (friendUsername) {
                    const profile = profiles[friendUsername];
                    return profile && isFriendOnline(profile.last_seen);
                }).length;

                if (onlineCount > 0) {
                    onlineFriendsCount.textContent = onlineCount;
                    onlineFriendsCount.classList.remove("hidden");
                } else {
                    onlineFriendsCount.classList.add("hidden");
                }
            });
        })
        .catch(function (error) {
            console.log("ONLINE FRIENDS COUNT ERROR:", error);
        });
}

if (friendsShortcut) {
    friendsShortcut.addEventListener("click", function () {
        window.location.href = "friends.html";
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

const playGamesCard = document.getElementById("playGamesCard");

if (playGamesCard) {
    playGamesCard.addEventListener("click", function () {
        window.location.href = "games.html";
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
const SCHEDULED_MATCH_GAMES = {
    clash: { name: "Clash Royale", icon: "../assets/games/clash-royale.png" },
    chess: { name: "Chess.com", icon: "../assets/games/chess-com.png" }
};

function coinHtml(amount) {
    return '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' +
        Number(amount || 0).toFixed(2);
}

// Matches are real now (see backend step) - fetched from GET
// /api/matches?matchType=scheduled and normalized into the same item
// shape buildScheduledMatchCard already expects. Tournaments stay mock
// (getMockScheduledTournaments below) until scheduled-tournament
// creation and per-participant staking are wired up.
function shortGameKey(fullGameName) {
    return fullGameName === "Chess.com" ? "chess" : "clash";
}

function normalizeRealMatchToScheduledItem(match) {
    return {
        id: match.id,
        type: "match",
        game: shortGameKey(match.game),
        scheduledFor: match.scheduledTime,
        entryFee: match.entryFee,
        stakingEnabled: match.stakingEnabled,
        stakedAmount: match.totalStaked || 0,
        creator: match.creatorUsername,
        opponent: match.opponentUsername
    };
}

function loadRealScheduledMatches() {
    return apiFetch("/api/matches?matchType=scheduled")
        .then(function (data) {
            if (!data.success || !data.matches) return [];

            return data.matches.map(normalizeRealMatchToScheduledItem);
        })
        .catch(function (error) {
            console.log("SCHEDULED MATCHES LOAD ERROR:", error);
            return [];
        });
}

// Placeholder data covering every button/badge state for tournaments —
// open slot, filled + staking room, filled + staking off — until
// scheduled-tournament creation and per-participant staking exist.
function getMockScheduledTournaments() {
    const now = Date.now();
    const hours = 60 * 60 * 1000;
    const days = 24 * hours;

    return [
        {
            id: "st_open_clash",
            type: "tournament",
            game: "clash",
            scheduledFor: new Date(now + 3 * hours).toISOString(),
            entryFee: 250,
            stakingEnabled: true,
            stakedAmount: 100,
            bracketSize: 8,
            joinedCount: 3
        },
        {
            id: "st_full_chess_nostake",
            type: "tournament",
            game: "chess",
            scheduledFor: new Date(now + 26 * hours).toISOString(),
            entryFee: 500,
            stakingEnabled: false,
            stakedAmount: 0,
            bracketSize: 4,
            joinedCount: 4
        },
        {
            id: "st_full_clash_stake",
            type: "tournament",
            game: "clash",
            scheduledFor: new Date(now + 70 * hours).toISOString(),
            entryFee: 1000,
            stakingEnabled: true,
            stakedAmount: 300,
            bracketSize: 16,
            joinedCount: 16
        }
    ];
}

function scheduledItemHasOpenSlot(item) {
    return item.type === "tournament"
        ? item.joinedCount < item.bracketSize
        : !item.opponent;
}

function getScheduledItemActionLabel(item) {
    return scheduledItemHasOpenSlot(item) ? "Join/Stake" : "View/Stake";
}

function buildScheduledMatchCard(item) {
    const gameInfo = SCHEDULED_MATCH_GAMES[item.game] || { name: item.game, icon: "" };
    const remainingToStake = Math.max(item.entryFee - item.stakedAmount, 0);
    const isTournament = item.type === "tournament";

    const stakeBadgeHtml = item.stakingEnabled
        ? '<span class="scheduled-match-stake-badge">' +
            coinHtml(remainingToStake) + ' of ' + coinHtml(item.entryFee) + ' open to stake' +
          '</span>'
        : "";

    const typeBadgeHtml = isTournament
        ? '<span class="scheduled-match-type-badge">Tournament</span>'
        : "";

    const participantsHtml = isTournament
        ? '<span class="tournament-slots">' + item.joinedCount + '/' + item.bracketSize + ' Joined</span>'
        : '<span class="player">' + item.creator + '</span>' +
          '<span class="vs">vs</span>' +
          (item.opponent
              ? '<span class="player">' + item.opponent + '</span>'
              : '<span class="player open-slot">Open Slot</span>');

    const card = document.createElement("div");
    card.className = "scheduled-match-card";
    card.dataset.matchId = item.id;

    card.innerHTML =
        '<div class="scheduled-match-top">' +
            '<div class="scheduled-match-game">' +
                '<img class="scheduled-match-game-icon" src="' + gameInfo.icon + '" alt="' + gameInfo.name + '">' +
                '<span class="scheduled-match-game-name">' + gameInfo.name + '</span>' +
                typeBadgeHtml +
            '</div>' +
            '<span class="scheduled-match-countdown" id="countdown-' + item.id + '"></span>' +
        '</div>' +
        '<div class="scheduled-match-players">' + participantsHtml + '</div>' +
        '<div class="scheduled-match-meta">' +
            '<span class="scheduled-match-entry">' + coinHtml(item.entryFee) + ' Entry</span>' +
            stakeBadgeHtml +
        '</div>' +
        '<button class="scheduled-match-action" type="button">' + getScheduledItemActionLabel(item) + '</button>';

    card.addEventListener("click", function () {
        window.location.href =
            "match-detail.html?matchId=" + encodeURIComponent(item.id) + "&type=" + item.type;
    });

    return card;
}

function loadScheduledMatches() {
    const section = document.getElementById("scheduledMatchesSection");
    const list = document.getElementById("scheduledMatchesList");

    if (!section || !list) return;

    // TODO: once scheduled tournaments have a real endpoint, fetch them
    // the same way as matches and merge + sort exactly like this — one
    // combined list, not two — rather than concatenating a mock array.
    loadRealScheduledMatches().then(function (realMatches) {
        const items = realMatches
            .concat(getMockScheduledTournaments())
            .sort(function (a, b) {
                return new Date(a.scheduledFor) - new Date(b.scheduledFor);
            });

        renderScheduledMatches(section, list, items);
    });
}

function renderScheduledMatches(section, list, items) {
    if (items.length === 0) {
        section.classList.add("hidden");
        return;
    }

    list.innerHTML = "";

    items.forEach(function (item) {
        list.appendChild(buildScheduledMatchCard(item));
    });

    section.classList.remove("hidden");

    items.forEach(function (item) {
        startCountdown(document.getElementById("countdown-" + item.id), item.scheduledFor);
    });
}

loadHomeProfile();
loadNotificationCount();
loadOnlineFriendsCount();
loadActiveTournament();
claimDailyReward();
loadScheduledMatches();

setInterval(loadNotificationCount, 15000);
setInterval(loadOnlineFriendsCount, 15000);