const API_BASE_URL = "https://api.pryzepot.com";

const loggedInUsername = localStorage.getItem("username");

if (!loggedInUsername) {
    window.location.href = "index.html";
}

const params = new URLSearchParams(window.location.search);
const viewedUsername = params.get("user") || loggedInUsername;

const profileBanner = document.getElementById("profileBanner");
const profileAvatar = document.getElementById("profileAvatar");
const profileUsername = document.getElementById("profileUsername");
const profileLevel = document.getElementById("profileLevel");

const xpCurrent = document.getElementById("xpCurrent");
const xpNext = document.getElementById("xpNext");
const xpFill = document.getElementById("xpFill");

const lifetimeWinnings = document.getElementById("lifetimeWinnings");
const wins = document.getElementById("wins");
const losses = document.getElementById("losses");
const tournamentMatchWins = document.getElementById("tournamentMatchWins");
const tournamentWins = document.getElementById("tournamentWins");

const profileActionButton = document.getElementById("profileActionButton");
const backButton = document.getElementById("backButton");

function formatMoney(value) {
    return "$" + Number(value || 0).toLocaleString();
}

function loadProfile() {
    fetch(API_BASE_URL + "/api/users/" + encodeURIComponent(viewedUsername) + "/profile")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success || !data.user) {
                alert(data.message || "Profile not found.");
                window.location.href = "home.html";
                return;
            }

            const user = data.user;
            const stats = user.stats || {};
            const xpProgress = user.xp_progress || {};

            profileBanner.src =
                "../assets/profile/" + (user.profile_banner || "banner1") + ".png";

            profileAvatar.src =
                "../assets/profile/" + (user.profile_picture || "avatar1") + ".png";

            profileUsername.textContent = user.username;
            profileLevel.textContent = "Level " + (user.level || 1);

            xpCurrent.textContent =
                (xpProgress.current_xp || 0) + " / " +
                (xpProgress.next_level_xp || 100) + " XP";

            xpNext.textContent =
                "Lvl " + (xpProgress.next_level || 2);

            setTimeout(function () {
                xpFill.style.width = (xpProgress.progress_percent || 0) + "%";
            }, 150);

            lifetimeWinnings.textContent =
                formatMoney(stats.lifetime_winnings);

            wins.textContent = stats.one_v_one_wins || 0;
            losses.textContent = stats.one_v_one_losses || 0;
            tournamentMatchWins.textContent = stats.tournament_match_wins || 0;
            tournamentWins.textContent = stats.tournament_wins || 0;

            if (user.username === loggedInUsername) {
                profileActionButton.textContent = "Edit Profile";

                profileActionButton.onclick = function () {
                    window.location.href = "profile-setup.html";
                };
            } else {
                profileActionButton.textContent = "Add Friend";

                profileActionButton.onclick = function () {
                    alert("Friends system coming next.");
                };
            }
        })
        .catch(function (error) {
            console.log("PROFILE LOAD ERROR:", error);
            alert("Could not load profile.");
            window.location.href = "home.html";
        });
}

if (backButton) {
    backButton.addEventListener("click", function () {
        history.back();
    });
}

loadProfile();