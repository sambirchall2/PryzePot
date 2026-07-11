const backHomeBtn = document.getElementById("backHomeBtn");
const watchBracketBtn = document.getElementById("watchBracketBtn");
const championProfileCard = document.getElementById("championProfileCard");
const pageEyebrow = document.getElementById("pageEyebrow");
const tapProfileText = document.getElementById("tapProfileText");
const inProgressMessage = document.getElementById("inProgressMessage");
const rewardRow = document.getElementById("rewardRow");

const winnerName = document.getElementById("winnerName");
const winnerTag = document.getElementById("winnerTag");
const winnerLevel = document.getElementById("winnerLevel");
const winnerAvatar = document.getElementById("winnerAvatar");
const winnerBanner = document.getElementById("winnerBanner");
const rewardAmount = document.getElementById("rewardAmount");

const championData = JSON.parse(
    localStorage.getItem("lastTournamentChampion") || "{}"
);

const championKnown = Boolean(championData.winnerUsername);

if (championKnown) {
    winnerName.textContent = championData.winnerUsername;
    winnerTag.textContent = championData.winnerTag || "";

    if (rewardAmount) {
        if (championData.prizePool && Number(championData.prizePool) > 0) {
            rewardAmount.textContent =
                "$" + Number(championData.prizePool).toLocaleString();
        } else {
            rewardAmount.textContent = "Champion";
        }
    }
} else {
    if (pageEyebrow) pageEyebrow.textContent = "TOURNAMENT IN PROGRESS";
    if (championProfileCard) championProfileCard.style.display = "none";
    if (tapProfileText) tapProfileText.style.display = "none";
    if (rewardRow) rewardRow.style.display = "none";
    if (inProgressMessage) inProgressMessage.style.display = "";
}

function openChampionProfile() {
    if (!championData.winnerUsername) return;

    window.location.href =
        "../html/profile.html?user=" +
        encodeURIComponent(championData.winnerUsername);
}

function loadChampionProfile() {
    if (!championData.winnerUsername) {
        return;
    }

    apiFetch(
        "/api/users/" +
        encodeURIComponent(championData.winnerUsername) +
        "/profile"
    )
        .then(function (data) {
            if (!data.success || !data.user) {
                return;
            }

            const user = data.user;

            winnerLevel.textContent =
                "Level " + (user.level || 1);

            winnerAvatar.src =
                "../assets/profile/" +
                (user.profile_picture || "avatar1") +
                ".png";

            winnerBanner.src =
                "../assets/profile/" +
                (user.profile_banner || "banner1") +
                ".png";
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

if (watchBracketBtn) {
    watchBracketBtn.addEventListener("click", function () {
        window.location.href = "tournament-room.html";
    });
}

loadChampionProfile();