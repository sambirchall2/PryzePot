const verifyStatus = document.getElementById("verifyStatus");

const API_BASE_URL = "https://pryzepot-production.up.railway.app";

const selectedMatchId = localStorage.getItem("selectedMatchId");

async function verifyMatch() {

    if (!selectedMatchId) {
        verifyStatus.textContent = "No match selected.";
        return;
    }

    verifyStatus.textContent =
        "Checking Clash Royale battle log...";

    try {

        const response = await fetch(
            API_BASE_URL +
            "/api/matches/" +
            selectedMatchId +
            "/verify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        console.log("VERIFY RESPONSE:", data);

        if (!data.success) {

            verifyStatus.textContent =
                data.message || "Verification failed.";

            return;
        }

        if (data.draw) {

            verifyStatus.textContent =
                "Battle found but ended in a draw.";

            return;
        }

        localStorage.setItem(
            "lastVerifiedMatch",
            JSON.stringify(data.match)
        );

        verifyStatus.textContent =
            data.winnerUsername + " won the match!";

        setTimeout(function () {

            window.location.href =
                "./match-results.html";

        }, 1500);

    } catch (error) {

        console.log("VERIFY ERROR:", error);

        verifyStatus.textContent =
            "Could not verify match.";
    }
}

verifyMatch();