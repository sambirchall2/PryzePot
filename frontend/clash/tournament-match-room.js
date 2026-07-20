const backBtn = document.getElementById("backBtn");
const roundLabel = document.getElementById("roundLabel");

const playerOneBanner = document.getElementById("playerOneBanner");
const playerOneAvatar = document.getElementById("playerOneAvatar");
const playerOneName = document.getElementById("playerOneName");
const playerOneLevel = document.getElementById("playerOneLevel");

const playerTwoBanner = document.getElementById("playerTwoBanner");
const playerTwoAvatar = document.getElementById("playerTwoAvatar");
const playerTwoName = document.getElementById("playerTwoName");
const playerTwoLevel = document.getElementById("playerTwoLevel");

const statusCard = document.getElementById("statusCard");
const openClashBtn = document.getElementById("openClashBtn");
const verifyMatchBtn = document.getElementById("verifyMatchBtn");
const advanceModal = document.getElementById("advanceModal");
const advanceContinueBtn = document.getElementById("advanceContinueBtn");

const currentTournamentId = localStorage.getItem("currentTournamentId");
const currentTournamentMatchId = localStorage.getItem("currentTournamentMatchId");
const username = localStorage.getItem("username");

let currentMatch = null;
let currentTournamentSize = null;
let redirectingToLoserScreen = false;
const profileCache = {};

if (!currentTournamentId || !currentTournamentMatchId) {
    window.location.href = "tournament-room.html";
}

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
        console.log("BATCH TOURNAMENT MATCH PROFILE LOAD ERROR:", error);

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
        console.log("TOURNAMENT MATCH PROFILE LOAD ERROR:", error);
        profileCache[usernameValue] = getDefaultProfile(usernameValue);
        return profileCache[usernameValue];
    }
}

function setPlayerCard(side, usernameValue, profile) {
    const avatar = getCosmeticImagePath(profile.equipped_avatar || profile.profile_picture || "avatar1", "Avatar");
    const banner = getCosmeticImagePath(profile.equipped_banner || profile.profile_banner || "banner1", "Banner");
    const level = profile.level || 1;

    if (side === "one") {
        playerOneName.textContent = usernameValue || "Player One";
        playerOneLevel.textContent = "Level " + level;
        playerOneAvatar.src = avatar;
        playerOneBanner.src = banner;
    }

    if (side === "two") {
        playerTwoName.textContent = usernameValue || "Player Two";
        playerTwoLevel.textContent = "Level " + level;
        playerTwoAvatar.src = avatar;
        playerTwoBanner.src = banner;
    }
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "tournament-room.html";
    });
}

if (advanceContinueBtn) {
    advanceContinueBtn.addEventListener("click", function () {
        window.location.href = "tournament-room.html";
    });
}

function getRoundTitle(roundNumber, totalRounds) {
    const roundsLeft = totalRounds - roundNumber;

    if (roundsLeft === 0) return "Championship";
    if (roundsLeft === 1) return "Semifinals";
    if (roundsLeft === 2) return "Quarterfinals";
    if (roundsLeft === 3) return "Round of 16";
    if (roundsLeft === 4) return "Round of 32";
    if (roundsLeft === 5) return "Round of 64";
    if (roundsLeft === 6) return "Round of 128";

    return "Round " + roundNumber;
}

function handleLossIfNeeded(match, tournamentSize) {
    if (!match || match.status !== "Completed") return false;
    if (!match.winner_username || match.winner_username === username) return false;
    if (redirectingToLoserScreen) return true;

    redirectingToLoserScreen = true;

    const totalRounds = Math.max(1, Math.ceil(Math.log2(Number(tournamentSize) || 1)));
    const isFinalRound = Number(match.round_number) === totalRounds;

    if (isFinalRound) {
        apiFetch("/api/tournaments/" + currentTournamentId)
            .then(function (tournamentData) {
                const tournament = tournamentData.tournament || {};
                const entryFee = Number(tournament.entry_fee || 0);
                const size = Number(tournament.max_players || 0);
                const prizePool = entryFee * size;

                localStorage.setItem(
                    "lastTournamentChampion",
                    JSON.stringify({
                        winnerUsername: match.winner_username,
                        winnerTag: match.winner_tag,
                        entryFee: entryFee,
                        tournamentSize: size,
                        prizePool: prizePool
                    })
                );

                window.location.href = "tournament-loser.html";
            })
            .catch(function () {
                localStorage.setItem(
                    "lastTournamentChampion",
                    JSON.stringify({
                        winnerUsername: match.winner_username,
                        winnerTag: match.winner_tag
                    })
                );

                window.location.href = "tournament-loser.html";
            });
    } else {
        localStorage.removeItem("lastTournamentChampion");
        window.location.href = "tournament-loser.html";
    }

    return true;
}

async function renderTournamentMatch(match, tournamentSize) {
    if (handleLossIfNeeded(match, tournamentSize)) return;

    currentMatch = match;

    const totalRounds = Math.max(1, Math.ceil(Math.log2(Number(tournamentSize) || 1)));

    roundLabel.textContent = getRoundTitle(Number(match.round_number), totalRounds);

    await warmProfileCache([match.player_one, match.player_two]);

    const playerOneProfile = await getUserProfile(match.player_one);
    const playerTwoProfile = await getUserProfile(match.player_two);

    setPlayerCard("one", match.player_one, playerOneProfile);
    setPlayerCard("two", match.player_two, playerTwoProfile);

    if (match.status === "Completed" && match.winner_username) {
        statusCard.textContent = "Winner: " + match.winner_username;
    } else {
        statusCard.textContent = match.status || "Ready";
    }

    if (match.status === "Completed") {
        verifyMatchBtn.textContent = "MATCH COMPLETE";
        verifyMatchBtn.disabled = true;
    } else {
        verifyMatchBtn.textContent = "VERIFY MATCH";
        verifyMatchBtn.disabled = false;
    }
}

function loadTournamentMatch() {
    apiFetch("/api/tournaments/" + currentTournamentId)
        .then(function (data) {
            if (!data.success) {
                alert(data.message);
                window.location.href = "tournament-room.html";
                return;
            }

            const foundMatch = (data.matches || []).find(function (match) {
                return String(match.id) === String(currentTournamentMatchId);
            });

            if (!foundMatch) {
                alert("Tournament match not found.");
                window.location.href = "tournament-room.html";
                return;
            }

            currentTournamentSize = data.tournament && data.tournament.max_players;

            renderTournamentMatch(foundMatch, currentTournamentSize);
        })
        .catch(function (error) {
            console.log("TOURNAMENT MATCH LOAD ERROR:", error);
            alert("Could not load tournament match.");
        });
}

openClashBtn.addEventListener("click", function () {
    if (!currentMatch) {
        alert("Match not loaded.");
        return;
    }

    let opponentFriendLink = null;

    if (username === currentMatch.player_one) {
        opponentFriendLink = currentMatch.player_two_friend_link;
    } else {
        opponentFriendLink = currentMatch.player_one_friend_link;
    }

    if (!opponentFriendLink) {
        alert("Opponent friend link not found.");
        return;
    }

    window.location.href = opponentFriendLink;
});

verifyMatchBtn.addEventListener("click", function () {
    if (!currentTournamentMatchId) {
        alert("Missing tournament match.");
        return;
    }

    verifyMatchBtn.textContent = "VERIFYING...";
    verifyMatchBtn.disabled = true;

    apiFetch("/api/tournament-matches/" + currentTournamentMatchId + "/verify", {
        method: "POST",
        body: JSON.stringify({})
    })
    .then(function (data) {
        if (!data.success) {
            alert(data.message);

            verifyMatchBtn.textContent = "VERIFY MATCH";
            verifyMatchBtn.disabled = false;
            return;
        }

        if (handleLossIfNeeded(data.match, currentTournamentSize)) {
            return;
        }

        if (data.playerState === "champion") {

    apiFetch("/api/tournaments/" + currentTournamentId)
        .then(function (tournamentData) {

            const tournament = tournamentData.tournament || {};

            const entryFee = Number(tournament.entry_fee || 0);
            const tournamentSize = Number(tournament.max_players || 0);
            const prizePool = entryFee * tournamentSize;

            localStorage.setItem(
                "lastTournamentChampion",
                JSON.stringify({
                    ...data,
                    entryFee: entryFee,
                    tournamentSize: tournamentSize,
                    prizePool: prizePool
                })
            );

            window.location.href = "tournament-winner.html";
        })
        .catch(function () {

            localStorage.setItem(
                "lastTournamentChampion",
                JSON.stringify(data)
            );

            window.location.href = "tournament-winner.html";
        });

    return;
}

        if (data.message && data.message.includes("Final is ready")) {
            if (advanceModal) {
                advanceModal.classList.remove("hidden");
                return;
            }

            window.location.href = "tournament-room.html";
            return;
        }

        window.location.href = "tournament-room.html";
    })
    .catch(function (error) {
        console.log("TOURNAMENT VERIFY ERROR:", error);
        alert("Could not verify tournament match.");

        verifyMatchBtn.textContent = "VERIFY MATCH";
        verifyMatchBtn.disabled = false;
    });
});

loadTournamentMatch();

setInterval(loadTournamentMatch, 5000);