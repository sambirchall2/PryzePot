const backBtn = document.getElementById("backBtn");
const playerTagInput = document.getElementById("playerTagInput");
const friendLinkInput = document.getElementById("friendLinkInput");
const verifyBtn = document.getElementById("verifyBtn");
const statusText = document.getElementById("statusText");

const API_BASE_URL = "http://https://pryzepot-production.up.railway.app";

const username = localStorage.getItem("username");

if (backBtn) {
    backBtn.addEventListener("click", function () {
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
    }

    if (savedName) {
        statusText.textContent =
            "Connected: " + savedName + " (" + savedTag + ")";
    } else {
        statusText.textContent =
            "Connected: " + savedTag;
    }

    statusText.classList.add("connected");
    verifyBtn.textContent = "CONTINUE";
}

verifyBtn.addEventListener("click", function () {
    const playerTag = playerTagInput.value.trim().toUpperCase();
    const friendLink = friendLinkInput.value.trim();

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

    if (friendLink === "") {
        alert("Please paste your Clash Royale friend invite link.");
        return;
    }

    if (!friendLink.includes("link.clashroyale.com")) {
        alert("Please enter a valid Clash Royale friend invite link.");
        return;
    }

    verifyBtn.textContent = "VERIFYING...";
    verifyBtn.disabled = true;

    fetch(API_BASE_URL + "/api/clash/verify-player", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            playerTag: playerTag
        })
    })
    .then(function (response) {
        return response.json();
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

        return fetch(API_BASE_URL + "/api/users/save-clash", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                clashTag: data.player.tag,
                clashName: data.player.name,
                clashFriendLink: friendLink,
                clashTrophies: data.player.trophies,
                clashExpLevel: data.player.expLevel
            })
        })
        .then(function (saveResponse) {
            return saveResponse.json();
        })
        .then(function (saveData) {
            if (saveData.success !== true) {
                alert(saveData.message || "Clash verified, but could not save to account.");

                verifyBtn.textContent = "VERIFY ACCOUNT";
                verifyBtn.disabled = false;
                return;
            }

            statusText.textContent =
                "Connected: " +
                data.player.name +
                " (" +
                data.player.tag +
                ")";

            statusText.classList.add("connected");

            const afterConnectRedirect =
                localStorage.getItem("afterConnectRedirect") || "entry.html";

            localStorage.removeItem("afterConnectRedirect");

            window.location.href = afterConnectRedirect;
        });
    })
    .catch(function (error) {
        console.log("ERROR:", error);

        alert("Could not verify Clash account. Make sure your backend is running.");

        verifyBtn.textContent = "VERIFY ACCOUNT";
        verifyBtn.disabled = false;
    });
});