const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backButton = document.getElementById("backButton");
const clashCard = document.getElementById("clashCard");

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

const lockedTiles = document.querySelectorAll(".game-tile.locked");

lockedTiles.forEach(function (tile) {
    tile.addEventListener("click", function () {
        showToast("Coming Soon", "success");
    });
});
