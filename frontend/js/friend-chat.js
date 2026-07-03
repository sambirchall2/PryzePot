const API_BASE_URL = "https://api.pryzepot.com";

const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const friendUsername = params.get("user");

if (!friendUsername) {
    window.location.href = "friends.html";
}

const backButton = document.getElementById("backButton");
const friendAvatar = document.getElementById("friendAvatar");
const friendUsernameDisplay = document.getElementById("friendUsername");
const friendStatus = document.getElementById("friendStatus");
const challengeButton = document.getElementById("challengeButton");

const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const challengeModal = document.getElementById("challengeModal");
const challengeTitle = document.getElementById("challengeTitle");
const closeChallengeModal = document.getElementById("closeChallengeModal");
const challengeFeeButtons = document.querySelectorAll(".challenge-fee-btn");
const sendChallengeButton = document.getElementById("sendChallengeButton");

let selectedChallengeFee = null;

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "friends.html";
    });
}

function isOnline(lastSeen) {
    if (!lastSeen) return false;

    return Date.now() - Number(lastSeen) < 90000;
}

function formatTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(Number(timestamp));

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function loadFriendProfile() {
    fetch(API_BASE_URL + "/api/users/" + encodeURIComponent(friendUsername) + "/profile")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success || !data.user) {
                showToast("Could not load friend.", "error");
                return;
            }

            const user = data.user;

            friendUsernameDisplay.textContent = user.username;

            friendAvatar.src =
                "../assets/profile/" + (user.profile_picture || "avatar1") + ".png";

            if (isOnline(user.last_seen)) {
                friendStatus.textContent = "● Online";
                friendStatus.style.color = "#b6ff00";
            } else {
                friendStatus.textContent = "Offline";
                friendStatus.style.color = "#9a9a9a";
            }

            challengeTitle.textContent = "Challenge " + user.username;
        })
        .catch(function (error) {
            console.log("LOAD FRIEND PROFILE ERROR:", error);
        });
}

function renderMessages(messages) {
    messagesContainer.innerHTML = "";

    if (!messages || messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="loading-message">
                No messages yet. Say what’s up.
            </div>
        `;
        return;
    }

    messages.forEach(function (message) {
        const row = document.createElement("div");

        const isMe = message.sender_username === username;

        row.className = isMe ? "message-row me" : "message-row friend";

        row.innerHTML = `
            <div class="message-bubble">
                <div>${message.message}</div>
                <div class="message-time">${formatTime(message.created_at)}</div>
            </div>
        `;

        messagesContainer.appendChild(row);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function loadMessages() {
    fetch(
        API_BASE_URL +
        "/api/friends/messages/" +
        encodeURIComponent(username) +
        "/" +
        encodeURIComponent(friendUsername)
    )
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success) {
                messagesContainer.innerHTML = `
                    <div class="loading-message">
                        ${data.message || "Could not load messages."}
                    </div>
                `;
                return;
            }

            renderMessages(data.messages || []);
        })
        .catch(function (error) {
            console.log("LOAD MESSAGES ERROR:", error);
        });
}

function sendMessage() {
    const message = messageInput.value.trim();

    if (!message) return;

    sendButton.disabled = true;

    fetch(API_BASE_URL + "/api/friends/messages/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            senderUsername: username,
            receiverUsername: friendUsername,
            message: message
        })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            sendButton.disabled = false;

            if (!data.success) {
                showToast(data.message || "Could not send message.", "error");
                return;
            }

            messageInput.value = "";
            loadMessages();
        })
        .catch(function (error) {
            console.log("SEND MESSAGE ERROR:", error);

            sendButton.disabled = false;
            showToast("Could not send message.", "error");
        });
}

function openChallengeModal() {
    selectedChallengeFee = null;

    challengeFeeButtons.forEach(function (button) {
        button.classList.remove("selected");
    });

    sendChallengeButton.disabled = true;
    sendChallengeButton.textContent = "Select Entry Fee";

    challengeModal.classList.remove("hidden");
}

function closeChallenge() {
    challengeModal.classList.add("hidden");
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

if (challengeButton) {
    challengeButton.addEventListener("click", openChallengeModal);
}

if (closeChallengeModal) {
    closeChallengeModal.addEventListener("click", closeChallenge);
}

if (sendChallengeButton) {
    sendChallengeButton.addEventListener("click", function () {
        if (!selectedChallengeFee) {
            showToast("Select an entry fee first.", "error");
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
                receiverUsername: friendUsername,
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

                window.location.href = "challenge-waiting.html";
            })
            .catch(function (error) {
                console.log("CHAT CHALLENGE ERROR:", error);

                showToast("Could not send challenge.", "error");

                sendChallengeButton.disabled = false;
                sendChallengeButton.textContent =
                    "Send $" + selectedChallengeFee + " Challenge";
            });
    });
}

if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
}

if (messageInput) {
    messageInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
}

loadFriendProfile();
loadMessages();

setInterval(loadMessages, 3000);
setInterval(loadFriendProfile, 30000);