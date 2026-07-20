const backBtn = document.getElementById("backBtn");
const playerTagInput = document.getElementById("playerTagInput");
const friendLinkInput = document.getElementById("friendLinkInput");
const verifyBtn = document.getElementById("verifyBtn");
const statusText = document.getElementById("statusText");

const username = localStorage.getItem("username");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        localStorage.removeItem("pendingTournamentId");
        localStorage.removeItem("pendingTournamentSetAt");
        localStorage.removeItem("afterConnectRedirect");

        window.location.href = "online.html";
    });
}

const savedTag = localStorage.getItem("clashPlayerTag");
const savedName = localStorage.getItem("clashPlayerName");
const savedFriendLink = localStorage.getItem("clashFriendLink");

if (savedTag) {
    playerTagInput.value = savedTag;

    if (savedFriendLink) {
        friendLinkInput.value = savedFriendLink;

        statusText.textContent = savedName
            ? "Connected: " + savedName + " (" + savedTag + ")"
            : "Connected: " + savedTag;

        statusText.classList.add("connected");
        verifyBtn.textContent = "CONTINUE";
    } else {
        statusText.textContent = "Your friend link expired after 24 hours — paste a fresh invite link to continue.";
        statusText.classList.remove("connected");
        verifyBtn.textContent = "VERIFY ACCOUNT";
    }
}

function finishConnectRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const isFriendChallenge = urlParams.get("friendChallenge") === "1";
    const challengeMatchId = urlParams.get("matchId");

    if (isFriendChallenge && challengeMatchId) {
        localStorage.setItem("currentMatchId", challengeMatchId);
        window.location.href = "match-room.html";
        return;
    }

    const afterConnectRedirect =
        localStorage.getItem("afterConnectRedirect") || "entry.html";

    localStorage.removeItem("afterConnectRedirect");

    window.location.href = afterConnectRedirect;
}

verifyBtn.addEventListener("click", function () {
    const playerTag = playerTagInput.value.trim().toUpperCase();
    const rawFriendLink = friendLinkInput.value.trim();

    const linkMatch = rawFriendLink.match(
        /https:\/\/link\.clashroyale\.com\/invite\/friend\/\S+/
    );

    if (!username) {
        alert("Please log in first.");
        window.location.href = "../html/index.html";
        return;
    }

    if (playerTag === "") {
        alert("Please enter your Clash Royale player tag.");
        return;
    }

    if (!playerTag.startsWith("#")) {
        alert("Player tag must start with #");
        return;
    }

    if (rawFriendLink === "") {
        alert("Please paste your Clash Royale friend invite link.");
        return;
    }

    if (!linkMatch) {
        alert("Please enter a valid Clash Royale friend invite link.");
        return;
    }

    const friendLink = linkMatch[0];

    verifyBtn.textContent = "VERIFYING...";
    verifyBtn.disabled = true;

    apiFetch("/api/clash/verify-player", {
        method: "POST",
        body: JSON.stringify({
            playerTag: playerTag
        })
    })
        .then(function (data) {
            if (data.success !== true) {
                alert(data.message);

                verifyBtn.textContent = "VERIFY ACCOUNT";
                verifyBtn.disabled = false;
                return;
            }

            localStorage.setItem("clashPlayerTag", data.player.tag);
            localStorage.setItem("clashPlayerName", data.player.name);
            localStorage.setItem("clashTrophies", data.player.trophies);
            localStorage.setItem("clashExpLevel", data.player.expLevel);
            localStorage.setItem("clashFriendLink", friendLink);

            return apiFetch("/api/users/save-clash", {
                method: "POST",
                body: JSON.stringify({
                    clashTag: data.player.tag,
                    clashName: data.player.name,
                    clashFriendLink: friendLink,
                    clashTrophies: data.player.trophies,
                    clashExpLevel: data.player.expLevel
                })
            })
                .then(function (saveData) {
                    if (saveData.success !== true) {
                        alert(saveData.message || "Clash verified, but could not save to account.");

                        verifyBtn.textContent = "VERIFY ACCOUNT";
                        verifyBtn.disabled = false;
                        return;
                    }

                    statusText.textContent =
                        "Connected: " + data.player.name + " (" + data.player.tag + ")";

                    statusText.classList.add("connected");

                    finishConnectRedirect();
                });
        })
        .catch(function (error) {
            console.log("ERROR:", error);

            alert("Could not verify Clash account. Make sure your backend is running.");

            verifyBtn.textContent = "VERIFY ACCOUNT";
            verifyBtn.disabled = false;
        });
});