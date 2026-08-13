const backBtn = document.getElementById("backBtn");
const createMatchBtn = document.getElementById("createMatchBtn");
const joinMatchBtn = document.getElementById("joinMatchBtn");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "../html/home.html";
    });
}

if (createMatchBtn) {
    createMatchBtn.addEventListener("click", function () {
        window.location.href = "chess.html";
    });
}

if (joinMatchBtn) {
    joinMatchBtn.addEventListener("click", function () {
        localStorage.setItem("afterConnectRedirect", "match-board.html");

        if (!getChessUsername()) {
            window.location.href = "connect-chess.html";
        } else {
            window.location.href = "match-board.html";
        }
    });
}