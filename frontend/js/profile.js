const loggedInUsername = localStorage.getItem("username");

if (!loggedInUsername) {
    window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const viewedUsername = params.get("user") || loggedInUsername;

const profileBanner = document.getElementById("profileBanner");
const profileAvatar = document.getElementById("profileAvatar");
const profileFrame = document.getElementById("profileFrame");
const profileBadge = document.getElementById("profileBadge");
const profileTitle = document.getElementById("profileTitle");
const profileUsername = document.getElementById("profileUsername");
const profileLevel = document.getElementById("profileLevel");

const xpCurrent = document.getElementById("xpCurrent");
const xpNext = document.getElementById("xpNext");
const xpFill = document.getElementById("xpFill");

const lifetimeWinnings = document.getElementById("lifetimeWinnings");
const record = document.getElementById("record");
const tournamentWins = document.getElementById("tournamentWins");

const profileActionButton = document.getElementById("profileActionButton");
const chatFriendButton = document.getElementById("chatFriendButton");
const removeFriendButton = document.getElementById("removeFriendButton");
const challengeModal = document.getElementById("challengeModal");
const challengeTitle = document.getElementById("challengeTitle");
const sendChallengeButton = document.getElementById("sendChallengeButton");
const closeChallengeModal = document.getElementById("closeChallengeModal");
const challengeFeeButtons = document.querySelectorAll(".challenge-fee-btn");
const backButton = document.getElementById("backButton");

function formatMoney(value) {
    return "$" + Number(value || 0).toLocaleString();
}

function setButtonLoading(text) {
    profileActionButton.disabled = true;
    profileActionButton.textContent = text;
}
let selectedChallengeFee = null;

function openChallengeModal() {

    selectedChallengeFee = null;

    challengeTitle.textContent =
        "Challenge " + viewedUsername;

    sendChallengeButton.disabled = true;
    sendChallengeButton.textContent = "Select Entry Fee";

    challengeFeeButtons.forEach(function(button){

        button.classList.remove("selected");

    });

    challengeModal.classList.remove("hidden");

}

function closeChallenge() {

    challengeModal.classList.add("hidden");

}

function hideRemoveFriendButton() {
    if (!removeFriendButton) return;

    removeFriendButton.classList.add("hidden");
    removeFriendButton.onclick = null;
}
function hideChatButton() {
    if (!chatFriendButton) return;

    chatFriendButton.classList.add("hidden");
    chatFriendButton.onclick = null;
}

function showChatButton() {
    if (!chatFriendButton) return;

    chatFriendButton.classList.remove("hidden");

    chatFriendButton.onclick = function () {
        window.location.href =
            "friend-chat.html?user=" + encodeURIComponent(viewedUsername);
    };
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
    hideChatButton();

    if (viewedUsername === loggedInUsername) {
        profileActionButton.textContent = "Edit Profile";
        profileActionButton.disabled = false;

        profileActionButton.onclick = function () {
            window.location.href = "profile-setup.html";
        };

        return;
    }

    apiFetch(
        "/api/friends/status/" +
        encodeURIComponent(loggedInUsername) +
        "/" +
        encodeURIComponent(viewedUsername)
    )
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
    openChallengeModal();
};

showChatButton();
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

    apiFetch("/api/friends/request", {
        method: "POST",
        body: JSON.stringify({
            receiverUsername: viewedUsername
        })
    })
        .then(function (data) {
            showToast(data.message, "success");
            loadFriendStatus();
        })
        .catch(function (error) {
            console.log("SEND FRIEND REQUEST ERROR:", error);
            showToast("Could not send friend request.", "error");
            loadFriendStatus();
        });
}

function acceptFriendRequest(requestId) {
    if (!requestId) {
        showToast("Missing friend request.", "error");
        return;
    }

    setButtonLoading("Accepting...");

    apiFetch("/api/friends/requests/" + requestId + "/accept", {
        method: "POST",
        body: JSON.stringify({})
    })
        .then(function (data) {
            showToast(data.message, "success");
            loadFriendStatus();
        })
        .catch(function (error) {
            console.log("ACCEPT FRIEND ERROR:", error);
            showToast("Could not accept friend request.", "error");
            loadFriendStatus();
        });
}

function removeFriend() {
    const confirmed = confirm("Remove " + viewedUsername + " as a friend?");

    if (!confirmed) return;

    removeFriendButton.disabled = true;
    removeFriendButton.textContent = "Removing...";

    apiFetch("/api/friends/remove", {
        method: "POST",
        body: JSON.stringify({
            friendUsername: viewedUsername
        })
    })
        .then(function (data) {
            showToast(data.message, "success");

            removeFriendButton.disabled = false;
            removeFriendButton.textContent = "Remove Friend";

            loadFriendStatus();
        })
        .catch(function (error) {
            console.log("REMOVE FRIEND ERROR:", error);
            showToast("Could not remove friend.", "error");

            removeFriendButton.disabled = false;
            removeFriendButton.textContent = "Remove Friend";

            loadFriendStatus();
        });
}

function loadProfile() {
    apiFetch("/api/users/" + encodeURIComponent(viewedUsername) + "/profile")
        .then(function (data) {
            if (!data.success || !data.user) {
                showToast(data.message || "Profile not found.", "error");
                window.location.href = "home.html";
                return;
            }

            const user = data.user;
            const stats = user.stats || {};
            const xpProgress = user.xp_progress || {};

            setImageIfExists(
    profileBanner,
    user.equipped_banner || user.profile_banner,
    "Banner",
    "banner1"
);

setImageIfExists(
    profileAvatar,
    user.equipped_avatar || user.profile_picture,
    "Avatar",
    "avatar1"
);

setImageIfExists(
    profileFrame,
    user.equipped_frame,
    "Frame",
    null
);

setImageIfExists(
    profileBadge,
    user.equipped_badge,
    "Badge",
    null
);

if (profileTitle) {
    if (user.equipped_title) {
        profileTitle.textContent = user.equipped_title;
        profileTitle.classList.remove("hidden");
    } else {
        profileTitle.classList.add("hidden");
    }
}

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
            showToast("Could not load profile.", "error");
            window.location.href = "home.html";
        });
}

if (backButton) {
    backButton.addEventListener("click", function () {
        history.back();
    });
}
challengeFeeButtons.forEach(function(button){

    button.addEventListener("click",function(){

        challengeFeeButtons.forEach(function(b){

            b.classList.remove("selected");

        });

        button.classList.add("selected");

        selectedChallengeFee =
            Number(button.dataset.entryFee);

        sendChallengeButton.disabled = false;

        sendChallengeButton.textContent =
            "Send $" + selectedChallengeFee + " Challenge";

    });

});

if(closeChallengeModal){

    closeChallengeModal.addEventListener("click",closeChallenge);

}
if (sendChallengeButton) {
    sendChallengeButton.addEventListener("click", function () {
        if (!selectedChallengeFee) {
            showToast("Select an entry fee first.", "error");
            return;
        }

        sendChallengeButton.disabled = true;
        sendChallengeButton.textContent = "Sending...";

        apiFetch("/api/friends/challenge", {
            method: "POST",
            body: JSON.stringify({
                receiverUsername: viewedUsername,
                entryFee: selectedChallengeFee
            })
        })
            .then(function (data) {

    if (!data.success) {

        showToast(data.message || "Could not send challenge.", "error");

        sendChallengeButton.disabled = false;

        sendChallengeButton.textContent =
            "Send $" + selectedChallengeFee + " Challenge";

        return;

    }

    localStorage.setItem(
        "pendingChallengeId",
        data.challenge.id
    );

    window.location.href =
        "../html/challenge-waiting.html";

})
            .catch(function (error) {
                console.log("SEND CHALLENGE ERROR:", error);
                showToast("Could not send challenge.", "error");

                sendChallengeButton.disabled = false;
                sendChallengeButton.textContent =
                    "Send $" + selectedChallengeFee + " Challenge";
            });
    });
}
loadProfile();