const username = localStorage.getItem("username");

const backButton = document.getElementById("backButton");
const friendRequestsContainer = document.getElementById("friendRequestsContainer");
const friendChallengesContainer = document.getElementById("friendChallengesContainer");

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
    return apiFetch("/api/users/" + encodeURIComponent(usernameValue) + "/profile")
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

/* Friend Requests */

function acceptRequest(requestId) {
    apiFetch("/api/friends/requests/" + requestId + "/accept", {
        method: "POST",
        body: JSON.stringify({})
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
    apiFetch("/api/friends/requests/" + requestId + "/decline", {
        method: "POST",
        body: JSON.stringify({})
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

function renderEmptyRequests() {
    friendRequestsContainer.innerHTML = `
        <div class="empty-state">
            <h2>No friend requests</h2>
            <p>New friend requests will appear here.</p>
        </div>
    `;
}

function loadFriendRequests() {
    friendRequestsContainer.innerHTML = `
        <div class="loading-card">
            Loading...
        </div>
    `;

    apiFetch("/api/friends/requests/" + encodeURIComponent(username))
        .then(async function (data) {
            if (!data.success) {
                renderEmptyRequests();
                return;
            }

            const requests = data.requests || [];

            if (requests.length === 0) {
                renderEmptyRequests();
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
            renderEmptyRequests();
        });
}

/* Friend Challenges */

function acceptChallenge(challengeId) {
    apiFetch("/api/friends/challenges/" + challengeId + "/accept", {
    method: "POST",
    body: JSON.stringify({})
})
        .then(function (data) {

    if (!data.success) {
        showToast(data.message || "Could not accept challenge.", "error");
        return;
    }

    showToast(data.message, "success");

    if (data.match && data.match.id) {

        localStorage.setItem("currentMatchId", data.match.id);

        window.location.href =
            "../clash/connect-clash.html?friendChallenge=1&matchId=" + data.match.id;

        return;
    }

    loadFriendChallenges();

})
        .catch(function (error) {
            console.log("ACCEPT CHALLENGE ERROR:", error);
            showToast("Could not accept challenge.", "error");
        });
}

function declineChallenge(challengeId) {
    apiFetch("/api/friends/challenges/" + challengeId + "/decline", {
        method: "POST"
    })
        .then(function (data) {
            showToast(data.message, "success");
            loadFriendChallenges();
        })
        .catch(function (error) {
            console.log("DECLINE CHALLENGE ERROR:", error);
            showToast("Could not decline challenge.", "error");
        });
}

function createChallengeCard(challenge) {
    const card = document.createElement("div");
    card.className = "challenge-card";

    card.innerHTML = `
        <div class="challenge-top">
            Incoming Challenge
        </div>

        <div class="challenge-name">
            ${challenge.challenger_username}
        </div>

        <div class="challenge-entry">
            <img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">${Number(challenge.entry_fee || 0).toLocaleString()} Match
        </div>

        <div class="challenge-buttons">
            <button class="accept-btn">
                Accept
            </button>

            <button class="decline-btn">
                Decline
            </button>
        </div>
    `;

    card.querySelector(".accept-btn").addEventListener("click", function () {
        acceptChallenge(challenge.id);
    });

    card.querySelector(".decline-btn").addEventListener("click", function () {
        declineChallenge(challenge.id);
    });

    return card;
}

function renderEmptyChallenges() {
    friendChallengesContainer.innerHTML = `
        <div class="empty-state">
            <h2>No challenges</h2>
            <p>Friend challenges will appear here.</p>
        </div>
    `;
}

function loadFriendChallenges() {
    friendChallengesContainer.innerHTML = `
        <div class="loading-card">
            Loading...
        </div>
    `;

    apiFetch("/api/friends/challenges/" + encodeURIComponent(username))
        .then(function (data) {
            if (!data.success) {
                renderEmptyChallenges();
                return;
            }

            const challenges = data.challenges || [];

            if (challenges.length === 0) {
                renderEmptyChallenges();
                return;
            }

            friendChallengesContainer.innerHTML = "";

            challenges.forEach(function (challenge) {
                const card = createChallengeCard(challenge);
                friendChallengesContainer.appendChild(card);
            });
        })
        .catch(function (error) {
            console.log("LOAD FRIEND CHALLENGES ERROR:", error);
            renderEmptyChallenges();
        });
}

loadFriendChallenges();
loadFriendRequests();