const backBtn = document.getElementById("backBtn");
const subtitle = document.getElementById("subtitle");
const playNowBtn = document.getElementById("playNowBtn");
const playNowHint = document.getElementById("playNowHint");
const scheduleBtn = document.getElementById("scheduleBtn");

const createGame = localStorage.getItem("createGame");
const createType = localStorage.getItem("createType");
const tournamentSize = localStorage.getItem("tournamentSize");

const GAME_LABELS = {
    clash: "Clash Royale",
    chess: "Chess.com",
    madden: "Madden NFL"
};

if (!createGame) {
    window.location.href = "games.html";
}

const isTournament = createType === "tournament" && tournamentSize;

if (subtitle) {
    const gameLabel = GAME_LABELS[createGame] || "Your match";
    const modeLabel = isTournament
        ? tournamentSize + "-Player Tournament"
        : "1v1 Online Match";

    subtitle.textContent = gameLabel + " · " + modeLabel;
}

if (playNowHint && isTournament) {
    playNowHint.textContent = "Create your tournament instantly and set up the bracket";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "../" + createGame + "/entry.html";
    });
}

// Madden skips rules.html here entirely (its rules-acknowledgment screen
// happens later, after someone joins - not at creation) and instead has to
// collect platform + skill difficulty before the match can be posted. Both
// the Play Now and Schedule paths detour through madden/platform.html ->
// skill-difficulty.html first, which then continue on to whichever
// destination this page stashes below - every other game's routing is
// unchanged.
if (playNowBtn) {
    playNowBtn.addEventListener("click", function () {
        if (createGame === "madden") {
            localStorage.setItem("maddenPostSetupRedirect", "post-match.html");
            window.location.href = "../madden/platform.html";
            return;
        }

        window.location.href = "../" + createGame + "/rules.html";
    });
}

if (scheduleBtn) {
    scheduleBtn.addEventListener("click", function () {
        if (createGame === "madden") {
            localStorage.setItem("maddenPostSetupRedirect", "../html/schedule-match.html");
            window.location.href = "../madden/platform.html";
            return;
        }

        window.location.href = "schedule-match.html";
    });
}
