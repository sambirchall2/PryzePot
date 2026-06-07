const backBtn = document.getElementById("backBtn");
const createMatchBtn = document.getElementById("createMatchBtn");
const joinMatchBtn = document.getElementById("joinMatchBtn");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "clash.html";
    });
}

if (createMatchBtn) {
    createMatchBtn.addEventListener("click", function () {
        localStorage.setItem("afterConnectRedirect", "entry.html");
        window.location.href = "connect-clash.html";
    });
}

if (joinMatchBtn) {
    joinMatchBtn.addEventListener("click", function () {
        localStorage.setItem("afterConnectRedirect", "match-board.html");

        const clashPlayerTag = localStorage.getItem("clashPlayerTag");
        const clashFriendLink = localStorage.getItem("clashFriendLink");

        if (!clashPlayerTag || !clashFriendLink) {
            window.location.href = "connect-clash.html";
        } else {
            window.location.href = "match-board.html";
        }
    });
}