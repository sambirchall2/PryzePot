const API_BASE_URL = "https://api.pryzepot.com";

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

async function getUserProfile(usernameValue) {
    if (!usernameValue) {
        return getDefaultProfile("Player");
    }

    if (profileCache[usernameValue]) {
        return profileCache[usernameValue];
    }

    try {
        const response = await fetch(API_BASE_URL + "/api/users/" + usernameValue + "/profile");
        const data = await response.json();

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
    const avatar = profile.profile_picture || "avatar1";
    const banner = profile.profile_banner || "banner1";
    const level = profile.level || 1;

    if (side === "one") {
        playerOneName.textContent = usernameValue || "Player One";
        playerOneLevel.textContent = "Level " + level;
        playerOneAvatar.src = "../assets/profile/" + avatar + ".png";
        playerOneBanner.src = "../assets/profile/" + banner + ".png";
    }

    if (side === "two") {
        playerTwoName.textContent = usernameValue || "Player Two";
        playerTwoLevel.textContent = "Level " + level;
        playerTwoAvatar.src = "../assets/profile/" + avatar + ".png";
        playerTwoBanner.src = "../assets/profile/" + banner + ".png";
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

async function renderTournamentMatch(match) {
    currentMatch = match;

    if (Number(match.round_number) === 1) {
        roundLabel.textContent = "Semifinal";
    } else if (Number(match.round_number) === 2) {
        roundLabel.textContent = "Final";
    } else {
        roundLabel.textContent = "Round " + match.round_number;
    }

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
    fetch(API_BASE_URL + "/api/tournaments/" + currentTournamentId)
        .then(function (response) {
            return response.json();
        })
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

            renderTournamentMatch(foundMatch);
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

    fetch(API_BASE_URL + "/api/tournament-matches/" + currentTournamentMatchId + "/verify", {
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
        if (!data.success) {
            alert(data.message);

            verifyMatchBtn.textContent = "VERIFY MATCH";
            verifyMatchBtn.disabled = false;
            return;
        }

        if (data.playerState === "champion") {

    fetch(API_BASE_URL + "/api/tournaments/" + currentTournamentId)
        .then(function (response) {
            return response.json();
        })
        .then(function (tournamentData) {

            const tournament = tournamentData.tournament || {};

            const entryFee = Number(tournament.entry_fee || 0);
            const tournamentSize = Number(tournament.tournament_size || 0);
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