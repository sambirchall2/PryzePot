const resultTitle = document.getElementById("resultTitle");
const resultSubtitle = document.getElementById("resultSubtitle");

const winnerCard = document.getElementById("winnerCard");
const loserCard = document.getElementById("loserCard");

const winnerName = document.getElementById("winnerName");
const winnerLevel = document.getElementById("winnerLevel");
const winnerAvatar = document.getElementById("winnerAvatar");
const winnerBanner = document.getElementById("winnerBanner");
const winnerWinnings = document.getElementById("winnerWinnings");
const winningsAmountText = document.getElementById("winningsAmountText");

const loserName = document.getElementById("loserName");
const loserLevel = document.getElementById("loserLevel");
const loserAvatar = document.getElementById("loserAvatar");
const loserBanner = document.getElementById("loserBanner");

const xpBurst = document.getElementById("xpBurst");
const resultXpText = document.getElementById("resultXpText");
const resultNextLevelText = document.getElementById("resultNextLevelText");
const resultXpFill = document.getElementById("resultXpFill");

const levelUpModal = document.getElementById("levelUpModal");
const levelUpNumber = document.getElementById("levelUpNumber");
const levelUpContinueBtn = document.getElementById("levelUpContinueBtn");

const playAgainButton = document.getElementById("playAgainButton");
const backHomeButton = document.getElementById("backHomeButton");
const disputeButton = document.getElementById("disputeButton");

const savedMatch = localStorage.getItem("lastVerifiedMatch");
const currentUsername = localStorage.getItem("username");

function openProfile(username) {
    if (!username) return;

    window.location.href =
        "../html/profile.html?user=" + encodeURIComponent(username);
}

function launchConfetti() {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;

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
        return profile.equipped_banner || profile.profile_banner || "banner1";
    }

    return profile.equipped_avatar || profile.profile_picture || "avatar1";
}

function getProfileLevel(profile) {
    if (!profile || !profile.level) {
        return 1;
    }

    return profile.level;
}

function updateResultXpBar(xpAmount) {
    if (!currentUsername) return;

    apiFetch("/api/users/" + currentUsername + "/profile")
        .then(function (data) {
            if (!data.success || !data.user || !data.user.xp_progress) return;

            const progress = data.user.xp_progress;

            if (xpBurst) {
                xpBurst.textContent = "+" + xpAmount + " XP";

                setTimeout(function () {
                    xpBurst.classList.add("show");
                }, 200);
            }

            if (resultXpText) {
                resultXpText.textContent =
                    progress.current_xp + " / " + progress.next_level_xp + " XP";
            }

            if (resultNextLevelText) {
                resultNextLevelText.textContent =
                    "Lvl " + progress.next_level;
            }

            if (resultXpFill) {
                setTimeout(function () {
                    resultXpFill.style.width = progress.progress_percent + "%";
                }, 450);
            }

            const leveledUp =
                progress.progress_xp < xpAmount &&
                progress.current_level > 1;

            if (leveledUp && levelUpModal && levelUpNumber) {
                levelUpNumber.textContent = "LEVEL " + progress.current_level;

                setTimeout(function () {
                    levelUpModal.classList.remove("hidden");
                }, 1400);
            }
        })
        .catch(function (error) {
            console.log("RESULT XP LOAD ERROR:", error);
        });
}

if (!savedMatch) {
    resultTitle.textContent = "No Result Found";
    resultSubtitle.textContent = "We could not find a verified match result.";

    winnerName.textContent = "-";
    loserName.textContent = "-";

    if (xpBurst) xpBurst.textContent = "+0 XP";

    if (disputeButton) disputeButton.style.display = "none";
} else {
    const match = JSON.parse(savedMatch);

    if (disputeButton && match.id) {
        disputeButton.addEventListener("click", function () {
            window.location.href = "../html/dispute.html?type=match&id=" + match.id;
        });
    } else if (disputeButton) {
        disputeButton.style.display = "none";
    }

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

    winnerAvatar.src =
        getCosmeticImagePath(getProfileImage(winnerProfile, "avatar"), "Avatar");

    winnerBanner.src =
        getCosmeticImagePath(getProfileImage(winnerProfile, "banner"), "Banner");

    loserAvatar.src =
        getCosmeticImagePath(getProfileImage(loserProfile, "avatar"), "Avatar");

    loserBanner.src =
        getCosmeticImagePath(getProfileImage(loserProfile, "banner"), "Banner");

    if (winnerWinnings && winningsAmountText) {
        const winnings = Number(match.entryFee || 0) * 2;

        if (winnings > 0) {
            winningsAmountText.textContent = "+" + winnings.toLocaleString();
            winnerWinnings.classList.remove("hidden");
        }
    }

    if (winnerCard) {
        winnerCard.style.cursor = "pointer";
        winnerCard.addEventListener("click", function () {
            openProfile(match.winnerUsername);
        });
    }

    if (loserCard) {
        loserCard.style.cursor = "pointer";
        loserCard.addEventListener("click", function () {
            openProfile(match.loserUsername);
        });
    }

    if (
        currentUsername &&
        match.winnerUsername &&
        currentUsername === match.winnerUsername
    ) {
        resultTitle.textContent = "🏆 Victory";
        resultSubtitle.textContent =
            "You earned +30 XP. Tap a player card to view their profile.";

        updateResultXpBar(30);
        launchConfetti();
    } else {
        resultTitle.textContent = "Defeat";
        resultSubtitle.textContent =
            "You earned +10 XP. Tap a player card to view their profile.";

        updateResultXpBar(10);
    }
}

if (levelUpContinueBtn) {
    levelUpContinueBtn.addEventListener("click", function () {
        levelUpModal.classList.add("hidden");
    });
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