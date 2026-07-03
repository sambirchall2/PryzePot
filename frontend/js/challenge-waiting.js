const API_BASE_URL = "https://api.pryzepot.com";

const challengeId = localStorage.getItem("pendingChallengeId");

const waitingText = document.getElementById("waitingText");
const cancelWaitingBtn = document.getElementById("cancelWaitingBtn");

if (!challengeId) {
    window.location.href = "home.html";
}

let pollInterval = null;

function checkChallengeStatus() {

    fetch(API_BASE_URL + "/api/friends/challenge/" + challengeId)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {

            if (!data.success || !data.challenge) {
                return;
            }

            const challenge = data.challenge;

            if (challenge.status === "accepted") {

                clearInterval(pollInterval);

                waitingText.textContent =
                    "Opponent accepted! Preparing your match...";

                localStorage.setItem(
                    "currentMatchId",
                    challenge.match_id
                );

                setTimeout(function () {

                    window.location.href =
                        "../clash/connect-clash.html?friendChallenge=1&matchId=" +
                        challenge.match_id;

                }, 1200);

            }

            if (challenge.status === "declined") {

                clearInterval(pollInterval);

                waitingText.textContent =
                    "Your friend declined the challenge.";

            }

        })
        .catch(function (error) {

            console.log("CHALLENGE STATUS ERROR:", error);

        });

}

if (cancelWaitingBtn) {

    cancelWaitingBtn.addEventListener("click", function () {

        clearInterval(pollInterval);

        localStorage.removeItem("pendingChallengeId");

        window.location.href = "home.html";

    });

}

checkChallengeStatus();

pollInterval = setInterval(checkChallengeStatus, 2000);