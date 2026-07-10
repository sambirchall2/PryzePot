const API_BASE_URL = "https://api.pryzepot.com";

const tournamentSizeDisplay = document.getElementById("tournamentSize");
const entryFeeDisplay = document.getElementById("entryFee");
const prizePoolDisplay = document.getElementById("prizePool");
const playerList = document.getElementById("playerList");
const statusCard = document.getElementById("statusCard");
const cancelTournamentBtn = document.getElementById("cancelTournamentBtn");
const bracketSection = document.getElementById("bracketSection");
const bracketList = document.getElementById("bracketList");
const advanceModal = document.getElementById("advanceModal");
const advanceContinueBtn = document.getElementById("advanceContinueBtn");

const currentTournamentId = localStorage.getItem("currentTournamentId");
const username = localStorage.getItem("username");

let currentTournament = null;
let profileCache = {};

if (!currentTournamentId) {
    window.location.href = "match-board.html";
}

function openProfile(usernameValue) {
    if (!usernameValue) return;

    window.location.href =
        "../html/profile.html?user=" + encodeURIComponent(usernameValue);
}

function getDefaultProfile(usernameValue) {
    return normalizePlayerProfile({
        username: usernameValue || "Player",
        profile_picture: "avatar1",
        profile_banner: "banner1",
        level: 1
    });
}

async function getUserProfile(usernameValue) {
    if (!usernameValue) {
        return getDefaultProfile("Player");
    }

    if (profileCache[usernameValue]) {
        return profileCache[usernameValue];
    }

    try {
        const response = await fetch(API_BASE_URL + "/api/users/" + encodeURIComponent(usernameValue) + "/profile");
        const data = await response.json();

        if (!data.success || !data.user) {
            profileCache[usernameValue] = getDefaultProfile(usernameValue);
            return profileCache[usernameValue];
        }

        profileCache[usernameValue] = normalizePlayerProfile(data.user);
        return profileCache[usernameValue];

    } catch (error) {
        console.log("TOURNAMENT PROFILE LOAD ERROR:", error);
        profileCache[usernameValue] = getDefaultProfile(usernameValue);
        return profileCache[usernameValue];
    }
}

function isUserInTournamentMatch(match) {
    return match.player_one === username || match.player_two === username;
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

function getTotalRounds(matches) {
    let highestRound = 1;

    matches.forEach(function (match) {
        if (Number(match.round_number) > highestRound) {
            highestRound = Number(match.round_number);
        }
    });

    return highestRound;
}

function buildPlayerCard(usernameValue, profile, isFilled) {
    if (!isFilled) {
        return buildTournamentPlayerCard(null, false);
    }

    const safeProfile = normalizePlayerProfile({
        ...profile,
        username: usernameValue
    });

    return buildTournamentPlayerCard(safeProfile, true);
}

function buildBracketPlayer(usernameValue, profile, match, tournamentIsComplete) {
    const safeProfile = usernameValue
        ? normalizePlayerProfile({
            ...profile,
            username: usernameValue
        })
        : null;

    let resultClass = "";
    let clickableClass = "";

    if (match.status === "Completed" && match.winner_username) {
        if (match.winner_username === usernameValue) {
            resultClass = "winner";
        } else {
            resultClass = "loser";
        }
    }

    if (tournamentIsComplete && usernameValue) {
        clickableClass = " clickable-profile";
    }

    if (!safeProfile) {
        return `
            <div
                class="bracket-player-row ${resultClass}${clickableClass}"
                data-profile-username="">
                <div class="pp-avatar-wrap pp-avatar-bracket">
                    <img class="pp-avatar" src="../assets/profile/avatar1.png" alt="TBD">
                </div>

                <div class="bracket-player-text">
                    <div class="bracket-player-name">TBD</div>
                    <div class="bracket-player-level">Waiting</div>
                </div>
            </div>
        `;
    }

    return `
        <div
            class="bracket-player-row ${resultClass}${clickableClass}"
            data-profile-username="${usernameValue || ""}">

            <div class="pp-avatar-wrap pp-avatar-bracket">
                <img
                    class="pp-avatar"
                    src="${getCosmeticImagePath(safeProfile.avatar, "Avatar")}"
                    alt="${safeProfile.username}"
                >

                ${
                    safeProfile.frame
                        ? `<img class="pp-frame" src="${getCosmeticImagePath(safeProfile.frame, "Frame")}" alt="Frame">`
                        : ""
                }
            </div>

            <div class="bracket-player-text">
                <div class="bracket-player-name">
                    ${safeProfile.username}
                </div>

                <div class="bracket-player-level">
                    Level ${safeProfile.level || 1}
                </div>

                <div class="pp-bracket-rewards">
                    ${
                        safeProfile.badge
                            ? `<img class="pp-badge" src="${getCosmeticImagePath(safeProfile.badge, "Badge")}" alt="Badge">`
                            : ""
                    }

                    ${
                        safeProfile.title
                            ? `<div class="pp-title">${safeProfile.title}</div>`
                            : ""
                    }
                </div>
            </div>
        </div>
    `;
}

async function renderBracket(matches, tournament) {
    if (!matches || matches.length === 0) {
        bracketSection.classList.add("hidden");
        bracketList.innerHTML = "";
        return;
    }

    bracketSection.classList.remove("hidden");
    bracketList.innerHTML = "";

    const tournamentIsComplete = tournament && tournament.status === "Completed";

    const totalRounds = getTotalRounds(matches);
    const matchesByRound = {};

    matches.forEach(function (match) {
        const roundNumber = Number(match.round_number);

        if (!matchesByRound[roundNumber]) {
            matchesByRound[roundNumber] = [];
        }

        matchesByRound[roundNumber].push(match);
    });

    for (const roundKey of Object.keys(matchesByRound)) {
        const roundNumber = Number(roundKey);
        const roundMatches = matchesByRound[roundNumber];

        const roundSection = document.createElement("div");
        roundSection.className = "bracket-round-section";

        const roundTitle = getRoundTitle(roundNumber, totalRounds);

        roundSection.innerHTML = `
            <div class="round-header">
                <span>${roundTitle}</span>
                <small>${roundMatches.length} Match${roundMatches.length === 1 ? "" : "es"}</small>
            </div>
        `;

        for (let index = 0; index < roundMatches.length; index++) {
            const match = roundMatches[index];

            const playerOneProfile = await getUserProfile(match.player_one);
            const playerTwoProfile = await getUserProfile(match.player_two);

            const bracketCard = document.createElement("div");
            bracketCard.className = "bracket-card";

            let enterButton = "";
            let winnerDisplay = "";

            if (match.status === "Completed" && match.winner_username) {
                winnerDisplay = `
                    <div class="bracket-winner">
                        Winner: ${match.winner_username}
                    </div>
                `;
            }

            if (match.status === "Ready" && isUserInTournamentMatch(match)) {
                enterButton = `
                    <button
                        class="enter-tournament-match-btn"
                        data-match-id="${match.id}">
                        ENTER MATCH
                    </button>
                `;
            }

            bracketCard.innerHTML = `
                <div class="bracket-round">
                    Match ${index + 1}
                </div>

                <div class="bracket-matchup">
                    ${buildBracketPlayer(match.player_one, playerOneProfile, match, tournamentIsComplete)}

                    <strong class="bracket-vs">VS</strong>

                    ${buildBracketPlayer(match.player_two, playerTwoProfile, match, tournamentIsComplete)}
                </div>

                <div class="bracket-status">
                    ${match.status}
                </div>

                ${winnerDisplay}

                ${enterButton}
            `;

            roundSection.appendChild(bracketCard);
        }

        bracketList.appendChild(roundSection);
    }

    document
        .querySelectorAll(".enter-tournament-match-btn")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                localStorage.setItem(
                    "currentTournamentMatchId",
                    button.dataset.matchId
                );

                window.location.href = "tournament-match-room.html";
            });
        });

    document
        .querySelectorAll(".clickable-profile")
        .forEach(function (row) {
            row.style.cursor = "pointer";

            row.addEventListener("click", function () {
                const clickedUsername = row.dataset.profileUsername;
                openProfile(clickedUsername);
            });
        });
}

async function renderTournamentRoom(tournament, players, matches) {
    currentTournament = tournament;

    const tournamentSize = Number(tournament.tournament_size);
    const entryFee = Number(tournament.entry_fee);
    const prizePool = tournamentSize * entryFee;

    tournamentSizeDisplay.textContent = tournamentSize + " Players";
    entryFeeDisplay.textContent = "$" + entryFee;
    prizePoolDisplay.textContent = "$" + prizePool;

    playerList.innerHTML = "";

    for (let i = 0; i < tournamentSize; i++) {
        if (players[i]) {
            const profile = await getUserProfile(players[i].username);
            playerList.innerHTML += buildPlayerCard(players[i].username, profile, true);
        } else {
            const profile = getDefaultProfile("Waiting...");
            playerList.innerHTML += buildPlayerCard(null, profile, false);
        }
    }

    await renderBracket(matches, tournament);

    const userFinalMatch = matches.find(function (match) {
        return (
            isUserInTournamentMatch(match) &&
            match.status === "Ready" &&
            Number(match.round_number) === getTotalRounds(matches) &&
            Number(match.round_number) > 1
        );
    });

    const alreadyShown =
        localStorage.getItem("advancedTournamentMatch_" + currentTournamentId);

    if (
        userFinalMatch &&
        alreadyShown !== String(userFinalMatch.id)
    ) {
        localStorage.setItem(
            "advancedTournamentMatch_" + currentTournamentId,
            String(userFinalMatch.id)
        );

        if (advanceModal) {
            advanceModal.classList.remove("hidden");
        }
    }

    const championMatch = matches
        .filter(function (match) {
            return (
                match.status === "Completed" &&
                match.winner_username
            );
        })
        .sort(function (a, b) {
            return Number(b.round_number) - Number(a.round_number);
        })[0];
        // Tournament finished.
// Decide where THIS player belongs.
if (
    tournament.status === "Completed" &&
    championMatch &&
    championMatch.winner_username
) {

    // Current player won.
    if (championMatch.winner_username === username) {

        const alreadyRedirected =
            localStorage.getItem("completedTournament_" + currentTournamentId);

        if (!alreadyRedirected) {

            localStorage.setItem(
                "completedTournament_" + currentTournamentId,
                "winner"
            );

            localStorage.setItem(
                "lastTournamentChampion",
                JSON.stringify({
                    winnerUsername: championMatch.winner_username,
                    winnerTag: championMatch.winner_tag,
                    prizePool: prizePool,
                    tournamentSize: tournamentSize,
                    entryFee: entryFee
                })
            );

            window.location.href = "tournament-winner.html";
            return;
        }

    } else {

    const alreadyRedirected =
        localStorage.getItem("completedTournament_" + currentTournamentId);

    if (!alreadyRedirected) {

        localStorage.setItem(
            "completedTournament_" + currentTournamentId,
            "loser"
        );

        localStorage.setItem(
            "lastTournamentChampion",
            JSON.stringify({
                winnerUsername: championMatch.winner_username,
                winnerTag: championMatch.winner_tag,
                prizePool: prizePool,
                tournamentSize: tournamentSize,
                entryFee: entryFee
            })
        );

        window.location.href = "tournament-loser.html";
        return;
    }
}

    if (
        tournament.status === "Completed" &&
        championMatch
    ) {
        statusCard.textContent =
            "🏆 Tournament Champion: " +
            championMatch.winner_username;
    } else if (tournament.status === "Open") {
        statusCard.textContent = "Waiting for tournament to fill...";
    } else if (tournament.status === "Full") {
        statusCard.textContent = "Tournament full. Bracket is ready.";
    } else if (tournament.status === "Cancelled") {
        statusCard.textContent = "Tournament cancelled.";
    }

    if (
        tournament.creator_username === username &&
        tournament.status === "Open"
    ) {
        cancelTournamentBtn.classList.remove("hidden");
    } else {
        cancelTournamentBtn.classList.add("hidden");
    }
}

function loadTournamentRoom() {
    fetch(API_BASE_URL + "/api/tournaments/" + currentTournamentId)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success) {
                alert(data.message);
                window.location.href = "match-board.html";
                return;
            }

            renderTournamentRoom(
                data.tournament,
                data.players,
                data.matches || []
            );
        })
        .catch(function (error) {
            console.log("TOURNAMENT ROOM ERROR:", error);
            alert("Could not load tournament room.");
        });
}

cancelTournamentBtn.addEventListener("click", function () {
    if (!currentTournamentId || !username) {
        alert("Missing tournament information.");
        return;
    }

    const confirmed = confirm("Cancel this tournament?");

    if (!confirmed) return;

    fetch(API_BASE_URL + "/api/tournaments/" + currentTournamentId + "/cancel", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username
        })
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        alert(data.message);

        if (data.success) {
            localStorage.removeItem("currentTournamentId");
            window.location.href = "match-board.html";
        }
    })
    .catch(function (error) {
        console.log("CANCEL TOURNAMENT ERROR:", error);
        alert("Could not cancel tournament.");
    });
});

if (advanceContinueBtn) {
    advanceContinueBtn.addEventListener("click", function () {
        advanceModal.classList.add("hidden");
    });
}

loadTournamentRoom();

setInterval(loadTournamentRoom, 5000);