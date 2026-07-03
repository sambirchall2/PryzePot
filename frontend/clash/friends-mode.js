const API_BASE_URL = "https://api.pryzepot.com";

const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "../html/index.html";
}

const backButton = document.getElementById("backButton");
const onlineFriendsList = document.getElementById("onlineFriendsList");
const offlineFriendsList = document.getElementById("offlineFriendsList");

const challengeModal = document.getElementById("challengeModal");
const challengeTitle = document.getElementById("challengeTitle");
const closeChallengeModal = document.getElementById("closeChallengeModal");
const challengeFeeButtons = document.querySelectorAll(".challenge-fee-btn");
const sendChallengeButton = document.getElementById("sendChallengeButton");

let selectedFriendUsername = null;
let selectedChallengeFee = null;

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "online.html";
    });
}

function isOnline(lastSeen) {
    if (!lastSeen) return false;

    return Date.now() - Number(lastSeen) < 90000;
}

function getLastSeenText(lastSeen) {
    if (!lastSeen) return "Offline";

    const minutes = Math.floor((Date.now() - Number(lastSeen)) / 60000);

    if (minutes < 1) return "Just now";
    if (minutes === 1) return "Last seen 1 min ago";
    if (minutes < 60) return "Last seen " + minutes + " min ago";

    const hours = Math.floor(minutes / 60);

    if (hours === 1) return "Last seen 1 hour ago";
    if (hours < 24) return "Last seen " + hours + " hours ago";

    return "Last seen yesterday";
}

function openProfile(friendUsername) {
    window.location.href =
        "../html/profile.html?user=" + encodeURIComponent(friendUsername);
}

function openChallengeModal(friendUsername) {
    selectedFriendUsername = friendUsername;
    selectedChallengeFee = null;

    challengeTitle.textContent = "Challenge " + friendUsername;

    sendChallengeButton.disabled = true;
    sendChallengeButton.textContent = "Select Entry Fee";

    challengeFeeButtons.forEach(function (button) {
        button.classList.remove("selected");
    });

    challengeModal.classList.remove("hidden");
}

function closeChallenge() {
    challengeModal.classList.add("hidden");
}

function createFriendCard(user, online) {
    const card = document.createElement("div");
    card.className = "friend-card";

    const statusText = online ? "Online" : getLastSeenText(user.last_seen);
    const dotClass = online ? "online-dot" : "offline-dot";

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

            <div class="friend-status">
                <span class="${dotClass}"></span>
                ${statusText}
            </div>
        </div>

        <button class="${online ? "challenge-button" : "view-button"}">
            ${online ? "Challenge" : "View"}
        </button>
    `;

    const button = card.querySelector("button");

    if (online) {
        button.addEventListener("click", function () {
            openChallengeModal(user.username);
        });
    } else {
        button.addEventListener("click", function () {
            openProfile(user.username);
        });
    }

    return card;
}

function loadFriendsMode() {
    onlineFriendsList.innerHTML = `<div class="loading-card">Loading...</div>`;
    offlineFriendsList.innerHTML = `<div class="loading-card">Loading...</div>`;

    fetch(API_BASE_URL + "/api/friends/" + encodeURIComponent(username))
        .then(function (response) {
            return response.json();
        })
        .then(async function (data) {
            if (!data.success || !data.friends || data.friends.length === 0) {
                onlineFriendsList.innerHTML =
                    `<div class="empty-card">No online friends.</div>`;
                offlineFriendsList.innerHTML =
                    `<div class="empty-card">No friends yet.</div>`;
                return;
            }

            const onlineCards = [];
            const offlineCards = [];

            for (const friendUsername of data.friends) {
                const response = await fetch(
                    API_BASE_URL + "/api/users/" +
                    encodeURIComponent(friendUsername) +
                    "/profile"
                );

                const result = await response.json();

                if (!result.success || !result.user) continue;

                const user = result.user;
                const online = isOnline(user.last_seen);
                const card = createFriendCard(user, online);

                if (online) {
                    onlineCards.push(card);
                } else {
                    offlineCards.push(card);
                }
            }

            onlineFriendsList.innerHTML = "";
            offlineFriendsList.innerHTML = "";

            if (onlineCards.length === 0) {
                onlineFriendsList.innerHTML =
                    `<div class="empty-card">No online friends.</div>`;
            } else {
                onlineCards.forEach(function (card) {
                    onlineFriendsList.appendChild(card);
                });
            }

            if (offlineCards.length === 0) {
                offlineFriendsList.innerHTML =
                    `<div class="empty-card">No offline friends.</div>`;
            } else {
                offlineCards.forEach(function (card) {
                    offlineFriendsList.appendChild(card);
                });
            }
        })
        .catch(function (error) {
            console.log("FRIENDS MODE LOAD ERROR:", error);

            onlineFriendsList.innerHTML =
                `<div class="empty-card">Could not load friends.</div>`;

            offlineFriendsList.innerHTML = "";
        });
}

challengeFeeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        challengeFeeButtons.forEach(function (b) {
            b.classList.remove("selected");
        });

        button.classList.add("selected");

        selectedChallengeFee = Number(button.dataset.entryFee);

        sendChallengeButton.disabled = false;
        sendChallengeButton.textContent =
            "Send $" + selectedChallengeFee + " Challenge";
    });
});

if (closeChallengeModal) {
    closeChallengeModal.addEventListener("click", closeChallenge);
}

if (sendChallengeButton) {
    sendChallengeButton.addEventListener("click", function () {
        if (!selectedFriendUsername || !selectedChallengeFee) {
            showToast("Select a friend and entry fee first.", "error");
            return;
        }

        sendChallengeButton.disabled = true;
        sendChallengeButton.textContent = "Sending...";

        fetch(API_BASE_URL + "/api/friends/challenge", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                challengerUsername: username,
                receiverUsername: selectedFriendUsername,
                entryFee: selectedChallengeFee
            })
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (!data.success) {
                    showToast(data.message || "Could not send challenge.", "error");

                    sendChallengeButton.disabled = false;
                    sendChallengeButton.textContent =
                        "Send $" + selectedChallengeFee + " Challenge";

                    return;
                }

                localStorage.setItem("pendingChallengeId", data.challenge.id);

                window.location.href =
                    "../html/challenge-waiting.html";
            })
            .catch(function (error) {
                console.log("FRIENDS MODE CHALLENGE ERROR:", error);

                showToast("Could not send challenge.", "error");

                sendChallengeButton.disabled = false;
                sendChallengeButton.textContent =
                    "Send $" + selectedChallengeFee + " Challenge";
            });
    });
}

loadFriendsMode();
setInterval(loadFriendsMode, 30000);