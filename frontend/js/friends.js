const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backButton = document.getElementById("backButton");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const friendsList = document.getElementById("friendsList");
let unreadMessagesByUser = {};
if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

function openProfile(playerUsername) {
    window.location.href =
        "profile.html?user=" + encodeURIComponent(playerUsername);
}
function openChat(playerUsername) {
    window.location.href =
        "friend-chat.html?user=" + encodeURIComponent(playerUsername);
}
function isOnline(lastSeen) {
    if (!lastSeen) return false;

    const now = Date.now();
    const difference = now - Number(lastSeen);

    return difference < 90000;
}

function getLastSeenText(lastSeen) {
    if (!lastSeen) return "Offline";

    const now = Date.now();
    const minutes = Math.floor((now - Number(lastSeen)) / 60000);

    if (minutes < 1) return "Just now";
    if (minutes === 1) return "Last seen 1 min ago";
    if (minutes < 60) return "Last seen " + minutes + " min ago";

    const hours = Math.floor(minutes / 60);

    if (hours === 1) return "Last seen 1 hour ago";
    if (hours < 24) return "Last seen " + hours + " hours ago";

    return "Last seen yesterday";
}

function createFriendCard(user) {
    const online = isOnline(user.last_seen);

    const card = document.createElement("div");
    card.className = "friend-card";

    card.innerHTML = `
        <img
            class="friend-avatar"
            src="../assets/profile/${user.profile_picture || "avatar1"}.png"
            alt="${user.username}"
        >

        <div class="friend-info">
            <div class="friend-name">
                ${user.username}
            </div>

            <div class="friend-level">
                Level ${user.level || 1}
            </div>

            <div class="friend-status ${online ? "online" : "offline"}">
                <span class="${online ? "online-dot" : "offline-dot"}"></span>
                ${online ? "Online · At Lobby" : getLastSeenText(user.last_seen)}
            </div>
        </div>

        <div class="friend-card-actions">

    <button class="chat-btn">
    Chat
    <span class="unread-badge hidden">
        0
    </span>
</button>

    <button class="view-profile-btn">
        View
    </button>

</div>
    `;

    card.querySelector(".view-profile-btn").addEventListener("click", function () {
        openProfile(user.username);
    });
    const unreadBadge = card.querySelector(".unread-badge");

const unreadCount = unreadMessagesByUser[user.username] || 0;

if (unreadCount > 0) {
    unreadBadge.textContent = unreadCount;
    unreadBadge.classList.remove("hidden");
}

card.querySelector(".chat-btn").addEventListener("click", function () {
    openChat(user.username);
});

    return {
        card: card,
        online: online
    };
}

function searchPlayers() {
    const query = searchInput.value.trim();

    if (query.length < 2) {
        searchResults.innerHTML = "";
        return;
    }

    apiFetch("/api/users/search/" + encodeURIComponent(query))
        .then(function (data) {
            searchResults.innerHTML = "";

            if (!data.success || !data.users.length) {
                searchResults.innerHTML = `
                    <div class="empty-card">
                        No players found.
                    </div>
                `;
                return;
            }

            data.users.forEach(function (user) {
                if (user.username === username) return;

                const card = document.createElement("div");
                card.className = "player-card";

                card.innerHTML = `
                    <img
                        class="player-avatar"
                        src="../assets/profile/${user.profile_picture || "avatar1"}.png"
                        alt="${user.username}"
                    >

                    <div class="player-info">
                        <div class="player-name">
                            ${user.username}
                        </div>

                        <div class="player-level">
                            Level ${user.level || 1}
                        </div>
                    </div>

                    <button class="view-profile-btn">
                        View
                    </button>
                `;

                card.querySelector(".view-profile-btn").addEventListener("click", function () {
                    openProfile(user.username);
                });

                searchResults.appendChild(card);
            });
        })
        .catch(function (error) {
            console.log("SEARCH PLAYERS ERROR:", error);
        });
}

function loadFriends() {
    friendsList.innerHTML = `
        <div class="loading-card">
            Loading...
        </div>
    `;

    apiFetch("/api/friends/unread/" + encodeURIComponent(username))
    .then(function (unreadData) {

        unreadMessagesByUser = unreadData.unread || {};

        return apiFetch("/api/friends/" + encodeURIComponent(username));

    })
        .then(async function (data) {
            if (!data.success) {
                friendsList.innerHTML = `
                    <div class="empty-card">
                        Could not load friends.
                    </div>
                `;
                return;
            }

            const friends = data.friends || [];

            if (friends.length === 0) {
                friendsList.innerHTML = `
                    <div class="empty-card">
                        You don't have any friends yet.
                    </div>
                `;
                return;
            }

            const onlineFriends = [];
            const offlineFriends = [];

            const batchResult = await apiFetch("/api/users/profiles-batch", {
                method: "POST",
                body: JSON.stringify({ usernames: friends })
            });

            const profiles = batchResult.profiles || {};

            for (const friendUsername of friends) {
                const user = profiles[friendUsername];

                if (!user) continue;

                const friendCard = createFriendCard(user);

                if (friendCard.online) {
                    onlineFriends.push(friendCard.card);
                } else {
                    offlineFriends.push(friendCard.card);
                }
            }

            friendsList.innerHTML = "";

            if (onlineFriends.length > 0) {
                const onlineTitle = document.createElement("div");
                onlineTitle.className = "friend-group-title";
                onlineTitle.textContent = "Online Friends";
                friendsList.appendChild(onlineTitle);

                onlineFriends.forEach(function (card) {
                    friendsList.appendChild(card);
                });
            }

            if (offlineFriends.length > 0) {
                const offlineTitle = document.createElement("div");
                offlineTitle.className = "friend-group-title";
                offlineTitle.textContent = "Offline Friends";
                friendsList.appendChild(offlineTitle);

                offlineFriends.forEach(function (card) {
                    friendsList.appendChild(card);
                });
            }
        })
        .catch(function (error) {
            console.log("LOAD FRIENDS ERROR:", error);

            friendsList.innerHTML = `
                <div class="empty-card">
                    Could not load friends.
                </div>
            `;
        });
}

searchInput.addEventListener("input", searchPlayers);

loadFriends();
setInterval(loadFriends, 30000);