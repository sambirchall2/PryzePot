const verifyStatus = document.getElementById("verifyStatus");

const selectedMatchId = localStorage.getItem("selectedMatchId");

async function verifyMatch() {

    if (!selectedMatchId) {
        verifyStatus.textContent = "No match selected.";
        return;
    }

    verifyStatus.textContent =
        "Checking Chess.com games...";

    try {

        const data = await apiFetch(
            "/api/matches/" +
            selectedMatchId +
            "/verify",
            {
                method: "POST"
            }
        );

        console.log("VERIFY RESPONSE:", data);

        if (!data.success) {

            verifyStatus.textContent =
                data.message || "Verification failed.";

            return;
        }

        if (data.draw) {

            verifyStatus.textContent =
                "Game found but ended in a draw.";

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