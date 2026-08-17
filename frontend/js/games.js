const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backButton = document.getElementById("backButton");
const clashCard = document.getElementById("clashCard");
const chessCard = document.getElementById("chessCard");
const maddenCard = document.getElementById("maddenCard");

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

if (clashCard) {
    clashCard.addEventListener("click", function () {
        window.location.href = "../clash/online.html";
    });
}

if (chessCard) {
    chessCard.addEventListener("click", function () {
        window.location.href = "../chess/online.html";
    });
}

if (maddenCard) {
    maddenCard.addEventListener("click", function () {
        window.location.href = "../madden/online.html";
    });
}

const lockedTiles = document.querySelectorAll(".game-tile.locked");

lockedTiles.forEach(function (tile) {
    tile.addEventListener("click", function () {
        showToast("Coming Soon", "success");
    });
});
