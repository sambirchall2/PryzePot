const API_BASE_URL = "https://api.pryzepot.com";

const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backButton = document.getElementById("backButton");
const podium = document.getElementById("podium");
const leaderboardList = document.getElementById("leaderboardList");
const yourRankCard = document.getElementById("yourRankCard");
const toast = document.getElementById("toast");

let selectedTime = "week";
let selectedGame = "all";

function formatMoney(amount) {
    return "$" + Number(amount || 0).toLocaleString();
}

function getAvatarPath(avatar) {
    return "../assets/profile/" + (avatar || "avatar1") + ".png";
}

function getBannerPath(banner) {
    return "../assets/profile/" + (banner || "banner1") + ".png";
}

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(function () {
        toast.classList.remove("show");
    }, 1800);
}

function openProfile(playerUsername) {
    window.location.href =
        "profile.html?user=" + encodeURIComponent(playerUsername);
}

function getTotalWins(player) {
    return (
        Number(player.one_v_one_wins || 0) +
        Number(player.tournament_match_wins || 0)
    );
}

function getTotalLosses(player) {
    return (
        Number(player.one_v_one_losses || 0) +
        Number(player.tournament_match_losses || 0)
    );
}

function isCurrentUser(player) {
    return player.username === username;
}

function renderPodium(players) {
    const topThree = players.slice(0, 3);

    if (!podium) return;

    if (topThree.length === 0) {
        podium.innerHTML = `
            <div class="empty-state">
                No ranked players yet.
            </div>
        `;
        return;
    }

    const podiumOrder = [];

    if (topThree[1]) {
        podiumOrder.push({ player: topThree[1], rank: 2 });
    }

    if (topThree[0]) {
        podiumOrder.push({ player: topThree[0], rank: 1 });
    }

    if (topThree[2]) {
        podiumOrder.push({ player: topThree[2], rank: 3 });
    }

    podium.innerHTML = podiumOrder.map(function (item) {
        const player = item.player;
        const rank = item.rank;

        const userClass = isCurrentUser(player) ? " current-user-card" : "";

        return `
            <div class="podium-card rank-${rank}${userClass}" data-username="${player.username}">
                <img class="podium-banner" src="${getBannerPath(player.profile_banner)}" alt="">
                <div class="podium-overlay"></div>

                <div class="rank-badge">#${rank}</div>

                <div class="podium-content">
                    <img class="podium-avatar" src="${getAvatarPath(player.profile_picture)}" alt="">
                    <div class="podium-name">${player.username}</div>
                    <div class="podium-money">${formatMoney(player.lifetime_winnings)}</div>
                    <div class="podium-record">${getTotalWins(player)}W - ${getTotalLosses(player)}L</div>
                </div>
            </div>
        `;
    }).join("");

    document.querySelectorAll(".podium-card").forEach(function (card) {
        card.addEventListener("click", function () {
            openProfile(card.dataset.username);
        });
    });
}

function renderLeaderboard(players) {
    if (!leaderboardList) return;

    const remainingPlayers = players.slice(3);

    if (remainingPlayers.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-list-row">
                More players will appear here after matches are completed.
            </div>
        `;
        return;
    }

    leaderboardList.innerHTML = remainingPlayers.map(function (player) {
        const userClass = isCurrentUser(player) ? " current-user-row" : "";

        return `
            <div class="leaderboard-row${userClass}" data-username="${player.username}">
                <img class="row-banner-bg" src="${getBannerPath(player.profile_banner)}" alt="">
                <div class="row-banner-overlay"></div>

                <div class="rank-number">#${player.rank}</div>

                <div class="player-cell">
                    <img class="row-avatar" src="${getAvatarPath(player.profile_picture)}" alt="">

                    <div class="player-meta">
                        <div class="player-name">
                            ${player.username}
                            ${isCurrentUser(player) ? '<span class="you-badge">YOU</span>' : ''}
                        </div>
                        <div class="player-sub">Level ${player.level}</div>
                    </div>
                </div>

                <div class="money-cell">${formatMoney(player.lifetime_winnings)}</div>
            </div>
        `;
    }).join("");

    document.querySelectorAll(".leaderboard-row").forEach(function (row) {
        row.addEventListener("click", function () {
            openProfile(row.dataset.username);
        });
    });
}

function renderYourRank(players) {
    if (!yourRankCard) return;

    const userPlayer = players.find(function (player) {
        return player.username === username;
    });

    if (!userPlayer) {
        yourRankCard.innerHTML = `
            <div class="your-label">YOUR RANK</div>
            <div class="empty-list-row">
                Play your first verified match to appear on the leaderboard.
            </div>
        `;
        return;
    }

    yourRankCard.innerHTML = `
        <img class="your-banner-bg" src="${getBannerPath(userPlayer.profile_banner)}" alt="">
        <div class="your-banner-overlay"></div>

        <div class="your-content">
            <div class="your-label">YOUR RANK</div>

            <div class="your-row" data-username="${userPlayer.username}">
                <div class="rank-number">#${userPlayer.rank}</div>

                <div class="player-cell">
                    <img class="row-avatar" src="${getAvatarPath(userPlayer.profile_picture)}" alt="">

                    <div class="player-meta">
                        <div class="player-name">
                            ${userPlayer.username}
                            <span class="you-badge">YOU</span>
                        </div>
                        <div class="player-sub">Level ${userPlayer.level}</div>
                    </div>
                </div>

                <div class="money-cell">${formatMoney(userPlayer.lifetime_winnings)}</div>
            </div>
        </div>
    `;

    const yourRow = yourRankCard.querySelector(".your-row");

    if (yourRow) {
        yourRow.addEventListener("click", function () {
            openProfile(userPlayer.username);
        });
    }
}

function renderLoadingState() {
    if (podium) {
        podium.innerHTML = `
            <div class="empty-state">
                Loading leaderboard...
            </div>
        `;
    }

    if (leaderboardList) {
        leaderboardList.innerHTML = "";
    }

    if (yourRankCard) {
        yourRankCard.innerHTML = "";
    }
}

function loadLeaderboard() {
    renderLoadingState();

    fetch(
        API_BASE_URL +
        "/api/leaderboard?game=" +
        encodeURIComponent(selectedGame) +
        "&time=" +
        encodeURIComponent(selectedTime)
    )
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success) {
                showToast(data.message || "Could not load leaderboard");
                return;
            }

            const players = data.players || [];

            renderPodium(players);
            renderLeaderboard(players);
            renderYourRank(players);
        })
        .catch(function (error) {
            console.log("LEADERBOARD LOAD ERROR:", error);
            showToast("Could not load leaderboard");
        });
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
        selectedTime = button.dataset.time || "week";
        loadLeaderboard();
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
        selectedGame = button.dataset.game || "all";
        loadLeaderboard();
    });
});

loadLeaderboard();