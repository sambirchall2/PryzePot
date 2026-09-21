const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backButton = document.getElementById("backButton");
const clashCard = document.getElementById("clashCard");
const chessCard = document.getElementById("chessCard");
const maddenCard = document.getElementById("maddenCard");
const streetfighterCard = document.getElementById("streetfighterCard");
const rocketleagueCard = document.getElementById("rocketleagueCard");
const leagueoflegendsCard = document.getElementById("leagueoflegendsCard");

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

if (streetfighterCard) {
    streetfighterCard.addEventListener("click", function () {
        window.location.href = "../streetfighter/online.html";
    });
}

if (rocketleagueCard) {
    rocketleagueCard.addEventListener("click", function () {
        window.location.href = "../rocketleague/online.html";
    });
}

if (leagueoflegendsCard) {
    leagueoflegendsCard.addEventListener("click", function () {
        window.location.href = "../leagueoflegends/online.html";
    });
}

const lockedTiles = document.querySelectorAll(".game-tile.locked");

lockedTiles.forEach(function (tile) {
    tile.addEventListener("click", function () {
        showToast("Coming Soon", "success");
    });
});
