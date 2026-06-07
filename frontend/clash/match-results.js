const resultTitle = document.getElementById("resultTitle");
const resultSubtitle = document.getElementById("resultSubtitle");
const winnerName = document.getElementById("winnerName");
const loserName = document.getElementById("loserName");
const playAgainButton = document.getElementById("playAgainButton");
const backHomeButton = document.getElementById("backHomeButton");

const savedMatch = localStorage.getItem("lastVerifiedMatch");
const currentUsername = localStorage.getItem("username");

function launchConfetti() {
    const canvas = document.getElementById("confettiCanvas");

    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext("2d");

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    const pieces = [];

    for (let i = 0; i < 150; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            size: Math.random() * 8 + 4,
            speed: Math.random() * 4 + 2,
            color: Math.random() > 0.5 ? "#c8ff00" : "#ffffff"
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        pieces.forEach(function (piece) {
            piece.y += piece.speed;

            if (piece.y > canvas.height + 20) {
                piece.y = -20;
            }

            ctx.fillStyle = piece.color;

            ctx.fillRect(
                piece.x,
                piece.y,
                piece.size,
                piece.size
            );
        });

        requestAnimationFrame(animate);
    }

    animate();

    setTimeout(function () {
        canvas.style.display = "none";
    }, 6000);
}

if (!savedMatch) {

    resultTitle.textContent = "No Result Found";

    resultSubtitle.textContent =
        "We could not find a verified match result.";

    winnerName.textContent = "-";
    loserName.textContent = "-";

} else {

    const match = JSON.parse(savedMatch);

    winnerName.textContent =
        match.winnerUsername || "Winner";

    loserName.textContent =
        match.loserUsername || "Loser";

    if (
        currentUsername &&
        match.winnerUsername &&
        currentUsername === match.winnerUsername
    ) {

        resultTitle.textContent = "🏆 Winner Confirmed";

        resultSubtitle.textContent =
            "Victory verified through Clash Royale battle logs.";

        launchConfetti();

    } else {

        resultTitle.textContent = "Match Complete";

        resultSubtitle.textContent =
            "The winner has been verified automatically.";
    }
}

playAgainButton.addEventListener("click", function () {

    localStorage.removeItem("currentMatchId");
    localStorage.removeItem("selectedMatchId");
    localStorage.removeItem("lastVerifiedMatch");

    window.location.href = "entry.html";
});

backHomeButton.addEventListener("click", function () {

    localStorage.removeItem("currentMatchId");
    localStorage.removeItem("selectedMatchId");
    localStorage.removeItem("lastVerifiedMatch");

    window.location.href = "../html/home.html";
});