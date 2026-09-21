const backBtn = document.getElementById("backBtn");
const onlineMode = document.getElementById("onlineMode");
const friendsMode = document.getElementById("friendsMode");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "online.html";
    });
}

if (onlineMode) {
    onlineMode.addEventListener("click", function () {
        localStorage.setItem("afterConnectRedirect", "entry.html");
        window.location.href = "connect-lol.html";
    });
}

if (friendsMode) {
    friendsMode.addEventListener("click", function () {
        window.location.href = "friends-mode.html";
    });
}
