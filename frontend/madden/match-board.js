const backBtn = document.getElementById("backBtn");
const matchesContainer = document.getElementById("matchesContainer");
const scheduledMatchesContainer = document.getElementById("scheduledMatchesContainer");

// entry_fee (matches) is a NUMERIC(10,2) column - PostgREST serializes
// NUMERIC as a JSON string (e.g. "500.00") to avoid float precision loss,
// so every displayed amount needs to go through Number(...) rather than
// being interpolated raw.
function coinHtml(amount) {
    return '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' +
        Number(amount || 0).toFixed(2);
}

const EDITION_LABELS = {
    "25": "Madden 25",
    "26": "Madden 26"
};

const PLATFORM_LABELS = {
    ps5_xbox: "PS5 / Xbox",
    pc: "PC"
};

const SKILL_LABELS = {
    rookie: "Rookie",
    pro: "Pro",
    all_pro: "All-Pro",
    all_madden: "All-Madden"
};

function matchBadgesHtml(match) {
    const editionLabel = EDITION_LABELS[match.edition] || match.edition;
    const platformLabel = PLATFORM_LABELS[match.platform] || match.platform;
    const skillLabel = SKILL_LABELS[match.skillDifficulty] || match.skillDifficulty;

    // Edition first - it's the thing players scan the board for before
    // anything else (see chat: "so people can see what game they wanna
    // play"), same badge style as platform/skill so it reads as one row.
    return '<div class="match-badge-row">' +
        (editionLabel ? '<span class="match-stake-badge">' + editionLabel + '</span>' : '') +
        '<span class="match-stake-badge">' + platformLabel + '</span>' +
        '<span class="match-stake-badge">' + skillLabel + '</span>' +
        '</div>';
}

const username = localStorage.getItem("username");

let loadedMatches = [];
const profileCache = {};

function getDefaultProfile(usernameValue) {
    return {
        username: usernameValue || "Player",
        profile_picture: "avatar1",
        profile_banner: "banner1",
        level: 1
    };
}

async function warmProfileCache(usernames) {
    const missing = [...new Set(usernames)].filter(function (usernameValue) {
        return usernameValue && !profileCache[usernameValue];
    });

    if (missing.length === 0) return;

    try {
        const data = await apiFetch("/api/users/profiles-batch", {
            method: "POST",
            body: JSON.stringify({ usernames: missing })
        });

        const profiles = data.profiles || {};

        missing.forEach(function (usernameValue) {
            profileCache[usernameValue] = profiles[usernameValue] || getDefaultProfile(usernameValue);
        });
    } catch (error) {
        console.log("BATCH PROFILE LOAD ERROR:", error);

        missing.forEach(function (usernameValue) {
            profileCache[usernameValue] = getDefaultProfile(usernameValue);
        });
    }
}

async function getUserProfile(usernameValue) {
    if (!usernameValue) {
        return getDefaultProfile("Player");
    }

    if (profileCache[usernameValue]) {
        return profileCache[usernameValue];
    }

    try {
        const data = await apiFetch("/api/users/" + usernameValue + "/profile");

        if (!data.success || !data.user) {
            profileCache[usernameValue] = getDefaultProfile(usernameValue);
            return profileCache[usernameValue];
        }

        profileCache[usernameValue] = data.user;
        return data.user;
    } catch (error) {
        console.log("PROFILE LOAD ERROR:", error);
        profileCache[usernameValue] = getDefaultProfile(usernameValue);
        return profileCache[usernameValue];
    }
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "online.html";
    });
}

function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return minutes + ":" + seconds.toString().padStart(2, "0");
}

function getMatchTimeLeft(match) {
    const now = Date.now();

    if (match.status === "Waiting for opponent") {
        return match.expiresAt - now;
    }

    if (match.status === "Match ready") {
        return match.verifyExpiresAt - now;
    }

    return 0;
}

function isUserInMatch(match) {
    return (
        match.creatorUsername === username ||
        match.opponentUsername === username
    );
}

function isScheduledMatch(match) {
    return match.matchType === "scheduled";
}

function getVisibleMatches(matches) {
    return matches.filter(function (match) {
        if (isScheduledMatch(match)) return false;

        if (match.status === "Completed") return false;
        if (match.status === "Cancelled") return false;
        if (match.status === "Draw") return false;

        const timeLeft = getMatchTimeLeft(match);
        if (timeLeft <= 0) return false;

        if (match.status === "Waiting for opponent") return true;

        if (match.status === "Match ready" && isUserInMatch(match)) {
            return true;
        }

        return false;
    });
}

function getVisibleScheduledMatches(matches) {
    return matches.filter(function (match) {
        if (!isScheduledMatch(match)) return false;
        if (match.status === "Completed") return false;
        if (match.status === "Cancelled") return false;
        if (match.status === "Expired") return false;
        if (match.status === "Draw") return false;

        return true;
    });
}

async function renderMatches() {
    const visibleMatches = getVisibleMatches(loadedMatches);

    if (visibleMatches.length === 0) {
        matchesContainer.innerHTML = `
            <div class="empty-state">
                No open matches yet.
            </div>
        `;
        return;
    }

    matchesContainer.innerHTML = "";

    await warmProfileCache(visibleMatches.map(function (match) {
        return match.creatorUsername;
    }));

    for (const match of visibleMatches) {
        const timeLeft = getMatchTimeLeft(match);
        const creatorProfile = await getUserProfile(match.creatorUsername);

        const avatar = creatorProfile.equipped_avatar || creatorProfile.profile_picture || "avatar1";
        const level = creatorProfile.level || 1;

        const matchCard = document.createElement("div");
        matchCard.className = "match-card";

        let timerLabel = "Expires in";
        if (match.status === "Match ready") {
            timerLabel = "Verify in";
        }

        let actionButton = `
            <button class="join-btn" data-match-id="${match.id}">
                JOIN MATCH
            </button>
        `;

        if (
            match.creatorUsername === username &&
            match.status === "Waiting for opponent"
        ) {
            actionButton = `
                <button class="cancel-btn" data-match-id="${match.id}">
                    CANCEL MATCH
                </button>
            `;
        }

        if (
            match.status === "Match ready" &&
            isUserInMatch(match)
        ) {
            actionButton = `
                <button class="view-room-btn" data-match-id="${match.id}">
                    VIEW ROOM
                </button>
            `;
        }

        matchCard.innerHTML = `
            <div class="match-game">
                Madden NFL
            </div>

            <div class="match-player-row">
                <img
                    class="match-avatar"
                    src="${getCosmeticImagePath(avatar, "Avatar")}"
                    alt="${match.creatorUsername}"
                >

                <div class="match-player-info">
                    <div class="match-player-name">
                        ${match.creatorUsername}
                    </div>

                    <div class="match-player-level">
                        Level ${level}
                    </div>
                </div>
            </div>

            <div class="match-entry">
                ${coinHtml(match.entryFee)}
            </div>

            ${matchBadgesHtml(match)}

            <div class="match-status">
                ${match.status}
            </div>

            <div class="match-timer">
                ${timerLabel}: ${formatCountdown(timeLeft)}
            </div>

            ${actionButton}
        `;

        matchesContainer.appendChild(matchCard);
    }

    attachButtonListeners();
}

function scheduledMatchHasOpenSlot(match) {
    return !match.opponentUsername;
}

function getScheduledMatchActionLabel(match) {
    return scheduledMatchHasOpenSlot(match) ? "JOIN/STAKE" : "VIEW/STAKE";
}

function buildScheduledMatchCard(match, creatorProfile) {
    const avatar = creatorProfile.equipped_avatar || creatorProfile.profile_picture || "avatar1";
    const level = creatorProfile.level || 1;

    const stakeBadgeHtml = (match.stakingEnabled && Number(match.remainingToStake) > 0)
        ? '<div class="match-stake-badge">' +
            coinHtml(match.remainingToStake) + ' of ' + coinHtml(match.entryFee) + ' open to stake' +
          '</div>'
        : "";

    const card = document.createElement("div");
    card.className = "match-card";

    card.innerHTML = `
        <div class="match-game">
            Madden NFL
        </div>

        <div class="match-player-row">
            <img
                class="match-avatar"
                src="${getCosmeticImagePath(avatar, "Avatar")}"
                alt="${match.creatorUsername}"
            >

            <div class="match-player-info">
                <div class="match-player-name">
                    ${match.creatorUsername}
                </div>

                <div class="match-player-level">
                    Level ${level}
                </div>
            </div>
        </div>

        <div class="match-entry">
            ${coinHtml(match.entryFee)}
        </div>

        ${matchBadgesHtml(match)}

        <div class="match-mode">
            ${scheduledMatchHasOpenSlot(match) ? "Open Slot" : "vs " + match.opponentUsername}
        </div>

        ${stakeBadgeHtml}

        <div class="match-timer" id="scheduled-countdown-${match.id}"></div>

        <button class="scheduled-match-btn" data-match-id="${match.id}">
            ${getScheduledMatchActionLabel(match)}
        </button>
    `;

    card.addEventListener("click", function () {
        window.location.href = "../html/match-detail.html?matchId=" + match.id + "&type=match";
    });

    return card;
}

let scheduledCountdownStopFns = [];

async function renderScheduledMatches() {
    if (!scheduledMatchesContainer) return;

    scheduledCountdownStopFns.forEach(function (stop) { stop(); });
    scheduledCountdownStopFns = [];

    const visibleScheduled = getVisibleScheduledMatches(loadedMatches);

    if (visibleScheduled.length === 0) {
        scheduledMatchesContainer.innerHTML = `
            <div class="empty-state">
                No scheduled matches yet.
            </div>
        `;
        return;
    }

    scheduledMatchesContainer.innerHTML = "";

    await warmProfileCache(visibleScheduled.map(function (match) {
        return match.creatorUsername;
    }));

    for (const match of visibleScheduled) {
        const creatorProfile = await getUserProfile(match.creatorUsername);
        scheduledMatchesContainer.appendChild(buildScheduledMatchCard(match, creatorProfile));
    }

    visibleScheduled.forEach(function (match) {
        scheduledCountdownStopFns.push(startCountdown(
            document.getElementById("scheduled-countdown-" + match.id),
            match.scheduledTime,
            { intervalMs: 30000 }
        ));
    });
}

function attachButtonListeners() {
    // EA name is always confirmed at connect-madden.html before joining
    // (same pattern as creation - never skipped even if one's already
    // saved, see chat). That page resumes the join itself once the name
    // is confirmed (see connect-madden.js's pendingJoinMatchId handling).
    document.querySelectorAll(".join-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const matchId = button.dataset.matchId;

            if (!username) {
                window.location.href = "../html/index.html";
                return;
            }

            localStorage.setItem("pendingJoinMatchId", matchId);
            window.location.href = "connect-madden.html";
        });
    });

    document.querySelectorAll(".cancel-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const matchId = button.dataset.matchId;

            apiFetch("/api/matches/" + matchId + "/cancel", {
                method: "POST",
                body: JSON.stringify({})
            })
            .then(function (data) {
                alert(data.message);
                loadMatches();
            });
        });
    });

    document.querySelectorAll(".view-room-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const matchId = button.dataset.matchId;

            localStorage.setItem("currentMatchId", matchId);
            window.location.href = "match-room.html";
        });
    });
}

function loadMatches() {
    apiFetch("/api/matches?game=" + encodeURIComponent("Madden NFL"))
        .then(function (data) {
            if (!data.success) {
                matchesContainer.innerHTML = `
                    <div class="empty-state">
                        Failed to load matches.
                    </div>
                `;
                return;
            }

            loadedMatches = data.matches;
            renderMatches();
            renderScheduledMatches();
        })
        .catch(function (error) {
            console.log("MATCH BOARD ERROR:", error);

            matchesContainer.innerHTML = `
                <div class="empty-state">
                    Could not connect to backend.
                </div>
            `;
        });
}

loadMatches();

setInterval(loadMatches, 5000);
