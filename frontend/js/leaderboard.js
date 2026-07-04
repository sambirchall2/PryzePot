const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backButton = document.getElementById("backButton");
const podium = document.getElementById("podium");
const leaderboardList = document.getElementById("leaderboardList");
const yourRankCard = document.getElementById("yourRankCard");
const toast = document.getElementById("toast");

const leaderboardPlayers = [
    {
        username: "birdogwar",
        level: 7,
        winnings: 2450,
        wins: 31,
        losses: 8,
        avatar: "avatar1",
        banner: "banner6"
    },
    {
        username: "ClashKing",
        level: 6,
        winnings: 1880,
        wins: 26,
        losses: 11,
        avatar: "avatar2",
        banner: "banner3"
    },
    {
        username: "NeonKnight",
        level: 5,
        winnings: 1540,
        wins: 21,
        losses: 10,
        avatar: "avatar3",
        banner: "banner5"
    },
    {
        username: "RoyalPush",
        level: 4,
        winnings: 980,
        wins: 14,
        losses: 7,
        avatar: "avatar4",
        banner: "banner2"
    },
    {
        username: "PotHunter",
        level: 4,
        winnings: 820,
        wins: 12,
        losses: 6,
        avatar: "avatar5",
        banner: "banner4"
    },
    {
        username: "charissa",
        level: 3,
        winnings: 740,
        wins: 10,
        losses: 5,
        avatar: "avatar6",
        banner: "banner1"
    },
    {
        username: username,
        level: Number(localStorage.getItem("level")) || 1,
        winnings: Number(localStorage.getItem("balance")) || 0,
        wins: 0,
        losses: 0,
        avatar: localStorage.getItem("profilePicture") || "avatar1",
        banner: localStorage.getItem("profileBanner") || "banner1"
    }
];

function formatMoney(amount) {
    return "$" + Number(amount || 0).toLocaleString();
}

function getAvatarPath(avatar) {
    return "../assets/profile/" + avatar + ".png";
}

function getBannerPath(banner) {
    return "../assets/profile/" + banner + ".png";
}

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(function () {
        toast.classList.remove("show");
    }, 1800);
}

function renderPodium(players) {
    const topThree = players.slice(0, 3);

    if (topThree.length < 3 || !podium) return;

    const podiumOrder = [
        { player: topThree[1], rank: 2 },
        { player: topThree[0], rank: 1 },
        { player: topThree[2], rank: 3 }
    ];

    podium.innerHTML = podiumOrder.map(function (item) {
        const player = item.player;
        const rank = item.rank;

        return `
            <div class="podium-card rank-${rank}">
                <img class="podium-banner" src="${getBannerPath(player.banner)}" alt="">
                <div class="podium-overlay"></div>

                <div class="rank-badge">#${rank}</div>

                <div class="podium-content">
                    <img class="podium-avatar" src="${getAvatarPath(player.avatar)}" alt="">
                    <div class="podium-name">${player.username}</div>
                    <div class="podium-money">${formatMoney(player.winnings)}</div>
                    <div class="podium-record">${player.wins}W - ${player.losses}L</div>
                </div>
            </div>
        `;
    }).join("");
}

function renderLeaderboard(players) {
    if (!leaderboardList) return;

    const remainingPlayers = players.slice(3);

    leaderboardList.innerHTML = remainingPlayers.map(function (player, index) {
        const rank = index + 4;

        return `
            <div class="leaderboard-row">
                <div class="rank-number">#${rank}</div>

                <div class="player-cell">
                    <img class="row-avatar" src="${getAvatarPath(player.avatar)}" alt="">

                    <div class="player-meta">
                        <div class="player-name">${player.username}</div>
                        <div class="player-sub">Lvl ${player.level} • ${player.wins}W - ${player.losses}L</div>
                    </div>
                </div>

                <div class="money-cell">${formatMoney(player.winnings)}</div>
            </div>
        `;
    }).join("");
}

function renderYourRank(players) {
    if (!yourRankCard) return;

    const userIndex = players.findIndex(function (player) {
        return player.username === username;
    });

    const userPlayer = userIndex >= 0 ? players[userIndex] : players[players.length - 1];
    const rank = userIndex >= 0 ? userIndex + 1 : players.length;

    yourRankCard.innerHTML = `
        <div class="your-label">YOUR RANK</div>

        <div class="your-row">
            <div class="rank-number">#${rank}</div>

            <div class="player-cell">
                <img class="row-avatar" src="${getAvatarPath(userPlayer.avatar)}" alt="">

                <div class="player-meta">
                    <div class="player-name">${userPlayer.username}</div>
                    <div class="player-sub">Lvl ${userPlayer.level} • ${userPlayer.wins}W - ${userPlayer.losses}L</div>
                </div>
            </div>

            <div class="money-cell">${formatMoney(userPlayer.winnings)}</div>
        </div>
    `;
}

function renderLeaderboardPage() {
    const sortedPlayers = leaderboardPlayers.sort(function (a, b) {
        return Number(b.winnings) - Number(a.winnings);
    });

    renderPodium(sortedPlayers);
    renderLeaderboard(sortedPlayers);
    renderYourRank(sortedPlayers);
}

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

document.querySelectorAll(".time-pill").forEach(function (button) {
    button.addEventListener("click", function () {
        document.querySelectorAll(".time-pill").forEach(function (pill) {
            pill.classList.remove("active");
        });

        button.classList.add("active");
    });
});

document.querySelectorAll(".game-pill").forEach(function (button) {
    button.addEventListener("click", function () {
        if (button.classList.contains("locked")) {
            showToast("Coming Soon");
            return;
        }

        document.querySelectorAll(".game-pill").forEach(function (pill) {
            pill.classList.remove("active");
        });

        button.classList.add("active");
    });
});

renderLeaderboardPage();