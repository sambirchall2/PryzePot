const API_BASE_URL = "https://api.pryzepot.com";

const loggedInUsername = localStorage.getItem("username");

if (!loggedInUsername) {
    window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const viewedUsername = params.get("user") || loggedInUsername;

const profileBanner = document.getElementById("profileBanner");
const profileAvatar = document.getElementById("profileAvatar");
const profileUsername = document.getElementById("profileUsername");
const profileLevel = document.getElementById("profileLevel");

const xpCurrent = document.getElementById("xpCurrent");
const xpNext = document.getElementById("xpNext");
const xpFill = document.getElementById("xpFill");

const lifetimeWinnings = document.getElementById("lifetimeWinnings");
const record = document.getElementById("record");
const tournamentWins = document.getElementById("tournamentWins");

const profileActionButton = document.getElementById("profileActionButton");
const removeFriendButton = document.getElementById("removeFriendButton");
const backButton = document.getElementById("backButton");

function formatMoney(value) {
    return "$" + Number(value || 0).toLocaleString();
}

function setButtonLoading(text) {
    profileActionButton.disabled = true;
    profileActionButton.textContent = text;
}

function hideRemoveFriendButton() {
    if (!removeFriendButton) return;

    removeFriendButton.classList.add("hidden");
    removeFriendButton.onclick = null;
}

function showRemoveFriendButton() {
    if (!removeFriendButton) return;

    removeFriendButton.classList.remove("hidden");

    removeFriendButton.onclick = function () {
        removeFriend();
    };
}

function loadFriendStatus() {
    hideRemoveFriendButton();

    if (viewedUsername === loggedInUsername) {
        profileActionButton.textContent = "Edit Profile";
        profileActionButton.disabled = false;

        profileActionButton.onclick = function () {
            window.location.href = "profile-setup.html";
        };

        return;
    }

    fetch(
        API_BASE_URL +
        "/api/friends/status/" +
        encodeURIComponent(loggedInUsername) +
        "/" +
        encodeURIComponent(viewedUsername)
    )
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success) {
                profileActionButton.textContent = "Add Friend";
                profileActionButton.disabled = false;

                profileActionButton.onclick = function () {
                    sendFriendRequest();
                };

                return;
            }

            if (data.status === "friends") {
                profileActionButton.textContent = "Challenge Friend";
                profileActionButton.disabled = false;

                profileActionButton.onclick = function () {
                    alert("Friends Mode coming next.");
                };

                showRemoveFriendButton();
                return;
            }

            if (data.status === "request_sent") {
                profileActionButton.textContent = "Request Sent";
                profileActionButton.disabled = true;
                return;
            }

            if (data.status === "request_received") {
                profileActionButton.textContent = "Accept Friend";
                profileActionButton.disabled = false;

                profileActionButton.onclick = function () {
                    acceptFriendRequest(data.requestId);
                };

                return;
            }

            profileActionButton.textContent = "Add Friend";
            profileActionButton.disabled = false;

            profileActionButton.onclick = function () {
                sendFriendRequest();
            };
        })
        .catch(function (error) {
            console.log("FRIEND STATUS ERROR:", error);

            profileActionButton.textContent = "Add Friend";
            profileActionButton.disabled = false;

            profileActionButton.onclick = function () {
                sendFriendRequest();
            };
        });
}

function sendFriendRequest() {
    setButtonLoading("Sending...");

    fetch(API_BASE_URL + "/api/friends/request", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            senderUsername: loggedInUsername,
            receiverUsername: viewedUsername
        })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            alert(data.message);
            loadFriendStatus();
        })
        .catch(function (error) {
            console.log("SEND FRIEND REQUEST ERROR:", error);
            alert("Could not send friend request.");
            loadFriendStatus();
        });
}

function acceptFriendRequest(requestId) {
    if (!requestId) {
        alert("Missing friend request.");
        return;
    }

    setButtonLoading("Accepting...");

    fetch(API_BASE_URL + "/api/friends/requests/" + requestId + "/accept", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: loggedInUsername
        })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            alert(data.message);
            loadFriendStatus();
        })
        .catch(function (error) {
            console.log("ACCEPT FRIEND ERROR:", error);
            alert("Could not accept friend request.");
            loadFriendStatus();
        });
}

function removeFriend() {
    const confirmed = confirm("Remove " + viewedUsername + " as a friend?");

    if (!confirmed) return;

    removeFriendButton.disabled = true;
    removeFriendButton.textContent = "Removing...";

    fetch(API_BASE_URL + "/api/friends/remove", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: loggedInUsername,
            friendUsername: viewedUsername
        })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            alert(data.message);

            removeFriendButton.disabled = false;
            removeFriendButton.textContent = "Remove Friend";

            loadFriendStatus();
        })
        .catch(function (error) {
            console.log("REMOVE FRIEND ERROR:", error);
            alert("Could not remove friend.");

            removeFriendButton.disabled = false;
            removeFriendButton.textContent = "Remove Friend";

            loadFriendStatus();
        });
}

function loadProfile() {
    fetch(API_BASE_URL + "/api/users/" + encodeURIComponent(viewedUsername) + "/profile")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success || !data.user) {
                alert(data.message || "Profile not found.");
                window.location.href = "home.html";
                return;
            }

            const user = data.user;
            const stats = user.stats || {};
            const xpProgress = user.xp_progress || {};

            profileBanner.src =
                "../assets/profile/" + (user.profile_banner || "banner1") + ".png";

            profileAvatar.src =
                "../assets/profile/" + (user.profile_picture || "avatar1") + ".png";

            profileUsername.textContent = user.username;
            profileLevel.textContent = "Level " + (user.level || 1);

            xpCurrent.textContent =
                (xpProgress.current_xp || 0) + " / " +
                (xpProgress.next_level_xp || 100) + " XP";

            xpNext.textContent =
                "Lvl " + (xpProgress.next_level || 2);

            setTimeout(function () {
                xpFill.style.width = (xpProgress.progress_percent || 0) + "%";
            }, 150);

            lifetimeWinnings.textContent =
                formatMoney(stats.lifetime_winnings);

            record.textContent =
                (stats.one_v_one_wins || 0) + " / " + (stats.one_v_one_losses || 0);

            tournamentWins.textContent =
                stats.tournament_wins || 0;

            loadFriendStatus();
        })
        .catch(function (error) {
            console.log("PROFILE LOAD ERROR:", error);
            alert("Could not load profile.");
            window.location.href = "home.html";
        });
}

if (backButton) {
    backButton.addEventListener("click", function () {
        history.back();
    });
}

loadProfile();