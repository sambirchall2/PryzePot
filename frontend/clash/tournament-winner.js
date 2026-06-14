const backHomeBtn = document.getElementById("backHomeBtn");
const winnerName = document.getElementById("winnerName");
const winnerTag = document.getElementById("winnerTag");
const confettiCanvas = document.getElementById("confettiCanvas");

const championData =
    JSON.parse(
        localStorage.getItem("lastTournamentChampion") || "{}"
    );

winnerName.textContent =
    championData.winnerUsername || "Champion";

winnerTag.textContent =
    championData.winnerTag || "";

if (backHomeBtn) {
    backHomeBtn.addEventListener("click", function () {
        localStorage.removeItem("currentTournamentId");
        localStorage.removeItem("currentTournamentMatchId");
        localStorage.removeItem("lastTournamentChampion");

        window.location.href = "home.html";
    });
}

function startConfetti() {
    if (!confettiCanvas) return;

    const ctx = confettiCanvas.getContext("2d");

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const pieces = [];

    for (let i = 0; i < 140; i++) {
        pieces.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            size: Math.random() * 8 + 4,
            speed: Math.random() * 4 + 2,
            rotation: Math.random() * 360
        });
    }

    function drawConfetti() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        pieces.forEach(function (piece) {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation);

            ctx.fillStyle = Math.random() > 0.5 ? "#b7ff00" : "#ffffff";
            ctx.fillRect(
                -piece.size / 2,
                -piece.size / 2,
                piece.size,
                piece.size
            );

            ctx.restore();

            piece.y += piece.speed;
            piece.rotation += 0.08;

            if (piece.y > confettiCanvas.height) {
                piece.y = -20;
                piece.x = Math.random() * confettiCanvas.width;
            }
        });

        requestAnimationFrame(drawConfetti);
    }

    drawConfetti();
}

startConfetti();