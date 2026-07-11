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
const profileCache = {};

if (!currentTournamentId) {
    window.location.href = "match-board.html";
}

function openProfile(usernameValue) {
    if (!usernameValue) return;

    window.location.href =
        "../html/profile.html?user=" +
        encodeURIComponent(usernameValue);
}

function getDefaultProfile(usernameValue) {
    return normalizePlayerProfile({
        username: usernameValue || "Player",
        profile_picture: "avatar1",
        profile_banner: "banner1",
        level: 1
    });
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
            profileCache[usernameValue] = profiles[usernameValue]
                ? normalizePlayerProfile(profiles[usernameValue])
                : getDefaultProfile(usernameValue);
        });
    } catch (error) {
        console.log("BATCH TOURNAMENT PROFILE LOAD ERROR:", error);

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
        const data = await apiFetch(
            "/api/users/" +
            encodeURIComponent(usernameValue) +
            "/profile"
        );

        profileCache[usernameValue] =
            data.success && data.user
                ? normalizePlayerProfile(data.user)
                : getDefaultProfile(usernameValue);
    } catch (error) {
        console.log(
            "TOURNAMENT PROFILE LOAD ERROR:",
            error
        );

        profileCache[usernameValue] =
            getDefaultProfile(usernameValue);
    }

    return profileCache[usernameValue];
}

function isUserInTournamentMatch(match) {
    return (
        match.player_one === username ||
        match.player_two === username
    );
}

function getRoundTitle(
    roundNumber,
    totalRounds
) {
    const roundsLeft =
        totalRounds - roundNumber;

    if (roundsLeft === 0) {
        return "Championship";
    }

    if (roundsLeft === 1) {
        return "Semifinals";
    }

    if (roundsLeft === 2) {
        return "Quarterfinals";
    }

    if (roundsLeft === 3) {
        return "Round of 16";
    }

    if (roundsLeft === 4) {
        return "Round of 32";
    }

    if (roundsLeft === 5) {
        return "Round of 64";
    }

    if (roundsLeft === 6) {
        return "Round of 128";
    }

    return "Round " + roundNumber;
}

function getTotalRounds(matches) {
    if (
        !matches ||
        matches.length === 0
    ) {
        return 1;
    }

    return matches.reduce(
        function (highest, match) {
            return Math.max(
                highest,
                Number(match.round_number) || 1
            );
        },
        1
    );
}

function buildPlayerCard(
    usernameValue,
    profile,
    isFilled
) {
    if (!isFilled) {
        return buildTournamentPlayerCard(
            null,
            false
        );
    }

    return buildTournamentPlayerCard(
        normalizePlayerProfile({
            ...profile,
            username: usernameValue
        }),
        true
    );
}

function buildBracketPlayer(
    usernameValue,
    profile,
    match,
    tournamentIsComplete
) {
    const safeProfile = usernameValue
        ? normalizePlayerProfile({
            ...profile,
            username: usernameValue
        })
        : null;

    let resultClass = "";
    let clickableClass = "";

    if (
        match.status === "Completed" &&
        match.winner_username
    ) {
        resultClass =
            match.winner_username ===
            usernameValue
                ? "winner"
                : "loser";
    }

    if (
        tournamentIsComplete &&
        usernameValue
    ) {
        clickableClass =
            " clickable-profile";
    }

    if (!safeProfile) {
        return `
            <div
                class="bracket-player-row ${resultClass}${clickableClass}"
                data-profile-username=""
            >
                <div class="pp-avatar-wrap pp-avatar-bracket">
                    <img
                        class="pp-avatar"
                        src="../assets/profile/avatar1.png"
                        alt="TBD"
                    >
                </div>

                <div class="bracket-player-text">
                    <div class="bracket-player-name">
                        TBD
                    </div>

                    <div class="bracket-player-level">
                        Waiting
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div
            class="bracket-player-row ${resultClass}${clickableClass}"
            data-profile-username="${safeProfile.username}"
        >
            <div class="pp-avatar-wrap pp-avatar-bracket">
                <img
                    class="pp-avatar"
                    src="${getCosmeticImagePath(
                        safeProfile.avatar,
                        "Avatar"
                    )}"
                    alt="${safeProfile.username}"
                >

                ${
                    safeProfile.frame
                        ? `
                            <img
                                class="pp-frame"
                                src="${getCosmeticImagePath(
                                    safeProfile.frame,
                                    "Frame"
                                )}"
                                alt="Frame"
                            >
                        `
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
                            ? `
                                <img
                                    class="pp-badge"
                                    src="${getCosmeticImagePath(
                                        safeProfile.badge,
                                        "Badge"
                                    )}"
                                    alt="Badge"
                                >
                            `
                            : ""
                    }

                    ${
                        safeProfile.title
                            ? `
                                <div class="pp-title">
                                    ${safeProfile.title}
                                </div>
                            `
                            : ""
                    }
                </div>
            </div>
        </div>
    `;
}

async function renderBracket(
    matches,
    tournament
) {
    if (
        !bracketSection ||
        !bracketList
    ) {
        return;
    }

    if (
        !matches ||
        matches.length === 0
    ) {
        bracketSection.classList.add(
            "hidden"
        );

        bracketList.innerHTML = "";

        return;
    }

    bracketSection.classList.remove(
        "hidden"
    );

    bracketList.innerHTML = "";

    const tournamentIsComplete =
        tournament &&
        tournament.status === "Completed";

    const totalRounds =
        getTotalRounds(matches);

    const matchesByRound = {};

    matches.forEach(function (match) {
        const roundNumber =
            Number(match.round_number) || 1;

        if (!matchesByRound[roundNumber]) {
            matchesByRound[roundNumber] = [];
        }

        matchesByRound[roundNumber].push(
            match
        );
    });

    const roundKeys =
        Object.keys(matchesByRound).sort(
            function (a, b) {
                return (
                    Number(a) -
                    Number(b)
                );
            }
        );

    for (
        const roundKey of roundKeys
    ) {
        const roundNumber =
            Number(roundKey);

        const roundMatches =
            matchesByRound[roundNumber];

        const roundSection =
            document.createElement("div");

        roundSection.className =
            "bracket-round-section";

        roundSection.innerHTML = `
            <div class="round-header">
                <span>
                    ${getRoundTitle(
                        roundNumber,
                        totalRounds
                    )}
                </span>

                <small>
                    ${roundMatches.length}
                    Match${roundMatches.length === 1 ? "" : "es"}
                </small>
            </div>
        `;

        for (
            let index = 0;
            index < roundMatches.length;
            index++
        ) {
            const match =
                roundMatches[index];

            const profiles =
                await Promise.all([
                    getUserProfile(
                        match.player_one
                    ),
                    getUserProfile(
                        match.player_two
                    )
                ]);

            const playerOneProfile =
                profiles[0];

            const playerTwoProfile =
                profiles[1];

            const bracketCard =
                document.createElement(
                    "div"
                );

            bracketCard.className =
                "bracket-card";

            const winnerDisplay =
                match.status ===
                    "Completed" &&
                match.winner_username
                    ? `
                        <div class="bracket-winner">
                            Winner:
                            ${match.winner_username}
                        </div>
                    `
                    : "";

            const enterButton =
                match.status === "Ready" &&
                isUserInTournamentMatch(
                    match
                )
                    ? `
                        <button
                            class="enter-tournament-match-btn"
                            data-match-id="${match.id}"
                        >
                            ENTER MATCH
                        </button>
                    `
                    : "";

            bracketCard.innerHTML = `
                <div class="bracket-round">
                    Match ${index + 1}
                </div>

                <div class="bracket-matchup">
                    ${buildBracketPlayer(
                        match.player_one,
                        playerOneProfile,
                        match,
                        tournamentIsComplete
                    )}

                    <strong class="bracket-vs">
                        VS
                    </strong>

                    ${buildBracketPlayer(
                        match.player_two,
                        playerTwoProfile,
                        match,
                        tournamentIsComplete
                    )}
                </div>

                <div class="bracket-status">
                    ${match.status}
                </div>

                ${winnerDisplay}

                ${enterButton}
            `;

            roundSection.appendChild(
                bracketCard
            );
        }

        bracketList.appendChild(
            roundSection
        );
    }

    document
        .querySelectorAll(
            ".enter-tournament-match-btn"
        )
        .forEach(function (button) {
            button.addEventListener(
                "click",
                function () {
                    localStorage.setItem(
                        "currentTournamentMatchId",
                        button.dataset.matchId
                    );

                    window.location.href =
                        "tournament-match-room.html";
                }
            );
        });

    document
        .querySelectorAll(
            ".clickable-profile"
        )
        .forEach(function (row) {
            row.style.cursor = "pointer";

            row.addEventListener(
                "click",
                function () {
                    openProfile(
                        row.dataset
                            .profileUsername
                    );
                }
            );
        });
}

async function renderTournamentRoom(
    tournament,
    players,
    matches
) {
    currentTournament = tournament;

    const allUsernames = players
        .map(function (player) { return player.username; })
        .concat(
            matches.flatMap(function (match) {
                return [match.player_one, match.player_two];
            })
        );

    await warmProfileCache(allUsernames);

    const tournamentSize =
        Number(
            tournament.tournament_size
        ) || 0;

    const entryFee =
        Number(
            tournament.entry_fee
        ) || 0;

    const prizePool =
        tournamentSize * entryFee;

    if (tournamentSizeDisplay) {
        tournamentSizeDisplay.textContent =
            tournamentSize + " Players";
    }

    if (entryFeeDisplay) {
        entryFeeDisplay.textContent =
            "$" + entryFee;
    }

    if (prizePoolDisplay) {
        prizePoolDisplay.textContent =
            "$" + prizePool;
    }

    if (playerList) {
        playerList.innerHTML = "";

        for (
            let i = 0;
            i < tournamentSize;
            i++
        ) {
            if (players[i]) {
                const profile =
                    await getUserProfile(
                        players[i].username
                    );

                playerList.insertAdjacentHTML(
                    "beforeend",
                    buildPlayerCard(
                        players[i].username,
                        profile,
                        true
                    )
                );
            } else {
                playerList.insertAdjacentHTML(
                    "beforeend",
                    buildPlayerCard(
                        null,
                        getDefaultProfile(
                            "Waiting..."
                        ),
                        false
                    )
                );
            }
        }
    }

    await renderBracket(
        matches,
        tournament
    );

    const totalRounds =
        getTotalRounds(matches);

    const userFinalMatch =
        matches.find(function (match) {
            return (
                isUserInTournamentMatch(
                    match
                ) &&
                match.status === "Ready" &&
                Number(
                    match.round_number
                ) === totalRounds &&
                Number(
                    match.round_number
                ) > 1
            );
        });

    const advanceKey =
        "advancedTournamentMatch_" +
        currentTournamentId;

    const alreadyShown =
        localStorage.getItem(
            advanceKey
        );

    if (
        userFinalMatch &&
        alreadyShown !==
            String(userFinalMatch.id)
    ) {
        localStorage.setItem(
            advanceKey,
            String(userFinalMatch.id)
        );

        if (advanceModal) {
            advanceModal.classList.remove(
                "hidden"
            );
        }
    }

    const championMatch = matches
        .filter(function (match) {
            return (
                match.status ===
                    "Completed" &&
                match.winner_username
            );
        })
        .sort(function (a, b) {
            return (
                Number(b.round_number) -
                Number(a.round_number)
            );
        })[0];

    if (
        tournament.status ===
            "Completed" &&
        championMatch &&
        championMatch.winner_username
    ) {
        const completedTournamentKey =
            "completedTournament_" +
            currentTournamentId;

        const alreadyRedirected =
            localStorage.getItem(
                completedTournamentKey
            );

        if (!alreadyRedirected) {
            localStorage.setItem(
                "lastTournamentChampion",
                JSON.stringify({
                    winnerUsername:
                        championMatch
                            .winner_username,

                    winnerTag:
                        championMatch
                            .winner_tag,

                    prizePool:
                        prizePool,

                    tournamentSize:
                        tournamentSize,

                    entryFee:
                        entryFee
                })
            );

            const isWinner =
                championMatch
                    .winner_username ===
                username;

            localStorage.setItem(
                completedTournamentKey,
                isWinner
                    ? "winner"
                    : "loser"
            );

            window.location.href =
                isWinner
                    ? "tournament-winner.html"
                    : "tournament-loser.html";

            return;
        }
    }

    if (statusCard) {
        if (
            tournament.status ===
                "Completed" &&
            championMatch
        ) {
            statusCard.textContent =
                "🏆 Tournament Champion: " +
                championMatch
                    .winner_username;
        } else if (
            tournament.status === "Open"
        ) {
            statusCard.textContent =
                "Waiting for tournament to fill...";
        } else if (
            tournament.status === "Full"
        ) {
            statusCard.textContent =
                "Tournament full. Bracket is ready.";
        } else if (
            tournament.status ===
            "Cancelled"
        ) {
            statusCard.textContent =
                "Tournament cancelled.";
        } else {
            statusCard.textContent =
                "Tournament in progress.";
        }
    }

    if (cancelTournamentBtn) {
        const canCancel =
            tournament.creator_username ===
                username &&
            tournament.status === "Open";

        cancelTournamentBtn.classList.toggle(
            "hidden",
            !canCancel
        );
    }
}

async function loadTournamentRoom() {
    try {
        const data = await apiFetch(
            "/api/tournaments/" +
            currentTournamentId
        );

        if (!data.success) {
            alert(
                data.message ||
                "Could not load tournament."
            );

            window.location.href =
                "match-board.html";

            return;
        }

        await renderTournamentRoom(
            data.tournament,
            data.players || [],
            data.matches || []
        );
    } catch (error) {
        console.log(
            "TOURNAMENT ROOM ERROR:",
            error
        );

        alert(
            "Could not load tournament room."
        );
    }
}

if (cancelTournamentBtn) {
    cancelTournamentBtn.addEventListener(
        "click",
        async function () {
            if (
                !currentTournamentId ||
                !username
            ) {
                alert(
                    "Missing tournament information."
                );

                return;
            }

            const confirmed =
                confirm(
                    "Cancel this tournament?"
                );

            if (!confirmed) {
                return;
            }

            cancelTournamentBtn.disabled =
                true;

            try {
                const data =
                    await apiFetch(
                        "/api/tournaments/" +
                        currentTournamentId +
                        "/cancel",
                        {
                            method: "POST",
                            body: JSON.stringify({})
                        }
                    );

                alert(
                    data.message ||
                    "Tournament updated."
                );

                if (data.success) {
                    localStorage.removeItem(
                        "currentTournamentId"
                    );

                    window.location.href =
                        "match-board.html";

                    return;
                }
            } catch (error) {
                console.log(
                    "CANCEL TOURNAMENT ERROR:",
                    error
                );

                alert(
                    "Could not cancel tournament."
                );
            }

            cancelTournamentBtn.disabled =
                false;
        }
    );
}

if (advanceContinueBtn) {
    advanceContinueBtn.addEventListener(
        "click",
        function () {
            if (advanceModal) {
                advanceModal.classList.add(
                    "hidden"
                );
            }
        }
    );
}

loadTournamentRoom();

setInterval(
    loadTournamentRoom,
    5000
);