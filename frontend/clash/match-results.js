const resultTitle = document.getElementById("resultTitle");
const resultSubtitle = document.getElementById("resultSubtitle");

const winnerName = document.getElementById("winnerName");
const winnerLevel = document.getElementById("winnerLevel");
const winnerAvatar = document.getElementById("winnerAvatar");
const winnerBanner = document.getElementById("winnerBanner");

const loserName = document.getElementById("loserName");
const loserLevel = document.getElementById("loserLevel");
const loserAvatar = document.getElementById("loserAvatar");
const loserBanner = document.getElementById("loserBanner");

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
            color: Math.random() > 0.5 ? "#b6ff00" : "#ffffff"
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
            ctx.fillRect(piece.x, piece.y, piece.size, piece.size);
        });

        requestAnimationFrame(animate);
    }

    animate();

    setTimeout(function () {
        canvas.style.display = "none";
    }, 6000);
}

function getProfileImage(profile, type) {
    if (!profile) {
        return type === "banner" ? "banner1" : "avatar1";
    }

    if (type === "banner") {
        return profile.profile_banner || "banner1";
    }

    return profile.profile_picture || "avatar1";
}

function getProfileLevel(profile) {
    if (!profile || !profile.level) {
        return 1;
    }

    return profile.level;
}

if (!savedMatch) {
    resultTitle.textContent = "No Result Found";
    resultSubtitle.textContent = "We could not find a verified match result.";

    winnerName.textContent = "-";
    loserName.textContent = "-";
} else {
    const match = JSON.parse(savedMatch);

    const winnerProfile =
        match.winnerUsername === match.creatorUsername
            ? match.creatorProfile
            : match.opponentProfile;

    const loserProfile =
        match.loserUsername === match.creatorUsername
            ? match.creatorProfile
            : match.opponentProfile;

    winnerName.textContent = match.winnerUsername || "Winner";
    loserName.textContent = match.loserUsername || "Loser";

    winnerLevel.textContent = "Level " + getProfileLevel(winnerProfile);
    loserLevel.textContent = "Level " + getProfileLevel(loserProfile);

    winnerAvatar.src = "../assets/profile/" + getProfileImage(winnerProfile, "avatar") + ".png";
    winnerBanner.src = "../assets/profile/" + getProfileImage(winnerProfile, "banner") + ".png";

    loserAvatar.src = "../assets/profile/" + getProfileImage(loserProfile, "avatar") + ".png";
    loserBanner.src = "../assets/profile/" + getProfileImage(loserProfile, "banner") + ".png";

    if (
        currentUsername &&
        match.winnerUsername &&
        currentUsername === match.winnerUsername
    ) {
        resultTitle.textContent = "🏆 Victory";
        resultSubtitle.textContent = "You earned +30 XP. Battle verified through Clash Royale.";
        launchConfetti();
    } else {
        resultTitle.textContent = "Match Complete";
        resultSubtitle.textContent = "You earned +10 XP. The winner was verified automatically.";
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