const API_BASE_URL = "https://api.pryzepot.com";

const username = localStorage.getItem("username");

const backButton = document.getElementById("backButton");
const friendRequestsContainer = document.getElementById("friendRequestsContainer");

if (!username) {
    window.location.href = "index.html";
}

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

function getDefaultProfile(usernameValue) {
    return {
        username: usernameValue || "Player",
        profile_picture: "avatar1",
        level: 1
    };
}

function loadUserProfile(usernameValue) {
    return fetch(API_BASE_URL + "/api/users/" + encodeURIComponent(usernameValue) + "/profile")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success || !data.user) {
                return getDefaultProfile(usernameValue);
            }

            return data.user;
        })
        .catch(function () {
            return getDefaultProfile(usernameValue);
        });
}

function acceptRequest(requestId) {
    fetch(API_BASE_URL + "/api/friends/requests/" + requestId + "/accept", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username
        })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            showToast(data.message, "success");
            loadFriendRequests();
        })
        .catch(function (error) {
            console.log("ACCEPT REQUEST ERROR:", error);
            showToast("Could not accept request.", "error");
        });
}

function declineRequest(requestId) {
    fetch(API_BASE_URL + "/api/friends/requests/" + requestId + "/decline", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username
        })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            showToast(data.message, "success");
            loadFriendRequests();
        })
        .catch(function (error) {
            console.log("DECLINE REQUEST ERROR:", error);
            showToast("Could not decline request.", "error");
        });
}

function createRequestCard(request, profile) {
    const card = document.createElement("div");
    card.className = "request-card";

    const avatar = profile.profile_picture || "avatar1";
    const level = profile.level || 1;

    card.innerHTML = `
        <img
            class="request-avatar"
            src="../assets/profile/${avatar}.png"
            alt="${request.sender_username}"
        >

        <div class="request-info">
            <div class="request-name">
                ${request.sender_username}
            </div>

            <div class="request-level">
                Level ${level}
            </div>

            <div class="request-buttons">
                <button class="accept-btn" data-request-id="${request.id}">
                    Accept
                </button>

                <button class="decline-btn" data-request-id="${request.id}">
                    Decline
                </button>
            </div>
        </div>
    `;

    card.querySelector(".accept-btn").addEventListener("click", function () {
        acceptRequest(request.id);
    });

    card.querySelector(".decline-btn").addEventListener("click", function () {
        declineRequest(request.id);
    });

    return card;
}

function renderEmptyState() {
    friendRequestsContainer.innerHTML = `
        <div class="empty-state">
            <h2>No notifications</h2>
            <p>Friend requests and invites will appear here.</p>
        </div>
    `;
}

function loadFriendRequests() {
    friendRequestsContainer.innerHTML = `
        <div class="loading-card">
            Loading...
        </div>
    `;

    fetch(API_BASE_URL + "/api/friends/requests/" + encodeURIComponent(username))
        .then(function (response) {
            return response.json();
        })
        .then(async function (data) {
            if (!data.success) {
                renderEmptyState();
                return;
            }

            const requests = data.requests || [];

            if (requests.length === 0) {
                renderEmptyState();
                return;
            }

            friendRequestsContainer.innerHTML = "";

            for (const request of requests) {
                const profile = await loadUserProfile(request.sender_username);
                const card = createRequestCard(request, profile);

                friendRequestsContainer.appendChild(card);
            }
        })
        .catch(function (error) {
            console.log("LOAD FRIEND REQUESTS ERROR:", error);
            renderEmptyState();
        });
}

loadFriendRequests();