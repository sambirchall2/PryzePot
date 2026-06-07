const backBtn = document.getElementById("backBtn");
const entryAmountDisplay = document.getElementById("entryAmountDisplay");
const playerTagDisplay = document.getElementById("playerTagDisplay");
const postMatchBtn = document.getElementById("postMatchBtn");

const API_BASE_URL = "http://https://pryzepot-production.up.railway.app";

const username = localStorage.getItem("username");
const entryFee = localStorage.getItem("entryFee");
const clashPlayerTag = localStorage.getItem("clashPlayerTag");
const clashFriendLink = localStorage.getItem("clashFriendLink");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "rules.html";
    });
}

if (!username) {
    window.location.href = "../html/index.html";
}

if (!entryFee) {
    window.location.href = "entry.html";
}

if (!clashPlayerTag || !clashFriendLink) {
    window.location.href = "connect-clash.html";
}

entryAmountDisplay.textContent = "$" + entryFee;
playerTagDisplay.textContent = clashPlayerTag;

postMatchBtn.addEventListener("click", function () {
    postMatchBtn.textContent = "POSTING...";
    postMatchBtn.disabled = true;

    const matchData = {
        username: username,
        playerTag: clashPlayerTag,
        friendLink: clashFriendLink,
        entryFee: Number(entryFee)
    };

    fetch(API_BASE_URL + "/api/matches", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(matchData)
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (data.success === true) {
            localStorage.setItem("currentMatchId", data.match.id);
            window.location.href = "match-room.html";
        } else {
            alert(data.message);
            postMatchBtn.textContent = "POST MATCH";
            postMatchBtn.disabled = false;
        }
    })
    .catch(function (error) {
        console.log("ERROR:", error);

        alert("Could not post match. Make sure your backend server is running.");

        postMatchBtn.textContent = "POST MATCH";
        postMatchBtn.disabled = false;
    });
});