const backHomeBtn = document.getElementById("backHomeBtn");
const championProfileCard = document.getElementById("championProfileCard");

const winnerName = document.getElementById("winnerName");
const winnerTag = document.getElementById("winnerTag");
const winnerLevel = document.getElementById("winnerLevel");
const winnerAvatar = document.getElementById("winnerAvatar");
const winnerBanner = document.getElementById("winnerBanner");
const rewardAmount = document.getElementById("rewardAmount");

const confettiCanvas = document.getElementById("confettiCanvas");

const championData = JSON.parse(
    localStorage.getItem("lastTournamentChampion") || "{}"
);

const championUsername = championData.winnerUsername || "Champion";

winnerName.textContent = championUsername;
winnerTag.textContent = championData.winnerTag || "";
if (rewardAmount) {
    if (championData.prizePool && Number(championData.prizePool) > 0) {
        rewardAmount.textContent = "$" + Number(championData.prizePool).toLocaleString();
    } else {
        rewardAmount.textContent = "Glory";
    }
}

function openChampionProfile() {
    if (!championData.winnerUsername) return;

    window.location.href =
        "../html/profile.html?user=" + encodeURIComponent(championData.winnerUsername);
}

function loadChampionProfile() {
    if (!championData.winnerUsername) {
        return;
    }

    apiFetch("/api/users/" + encodeURIComponent(championData.winnerUsername) + "/profile")
        .then(function (data) {
            if (!data.success || !data.user) {
                return;
            }

            const user = data.user;

            winnerLevel.textContent = "Level " + (user.level || 1);
            winnerAvatar.src = "../assets/profile/" + (user.profile_picture || "avatar1") + ".png";
            winnerBanner.src = "../assets/profile/" + (user.profile_banner || "banner1") + ".png";
        })
        .catch(function (error) {
            console.log("CHAMPION PROFILE LOAD ERROR:", error);
        });
}

if (championProfileCard) {
    championProfileCard.style.cursor = "pointer";

    championProfileCard.addEventListener("click", function () {
        openChampionProfile();
    });
}

if (backHomeBtn) {
    backHomeBtn.addEventListener("click", function () {
        const finishedTournamentId =
            localStorage.getItem("currentTournamentId");

        if (finishedTournamentId) {
            localStorage.removeItem(
                "completedTournament_" + finishedTournamentId
            );

            localStorage.removeItem(
                "advancedTournamentMatch_" + finishedTournamentId
            );
        }

        localStorage.removeItem("currentTournamentId");
        localStorage.removeItem("currentTournamentMatchId");
        localStorage.removeItem("lastTournamentChampion");

        window.location.href = "../html/home.html";
    });
}

function startConfetti() {
    if (!confettiCanvas) return;

    const ctx = confettiCanvas.getContext("2d");

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const pieces = [];

    for (let i = 0; i < 160; i++) {
        pieces.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            size: Math.random() * 8 + 4,
            speed: Math.random() * 4 + 2,
            rotation: Math.random() * 360,
            color: Math.random() > 0.5 ? "#b7ff00" : "#ffffff"
        });
    }

    function drawConfetti() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        pieces.forEach(function (piece) {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation);

            ctx.fillStyle = piece.color;
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

loadChampionProfile();
startConfetti();