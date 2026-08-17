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
        window.location.href = "madden.html";
    });
}

if (joinMatchBtn) {
    // No "connect first" gate here (unlike Clash/Chess) - browsing the
    // board doesn't need an EA name, and the join action itself is a stub
    // for now (see match-board.js), so there's nothing to gate on yet.
    joinMatchBtn.addEventListener("click", function () {
        window.location.href = "match-board.html";
    });
}
