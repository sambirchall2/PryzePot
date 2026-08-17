const backBtn = document.getElementById("backBtn");
const agreeCheckbox = document.getElementById("agreeCheckbox");
const continueBtn = document.getElementById("continueBtn");

const username = localStorage.getItem("username");
const matchId = localStorage.getItem("currentMatchId");

if (!username) {
    window.location.href = "../html/index.html";
}

if (!matchId) {
    window.location.href = "match-board.html";
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "match-board.html";
    });
}

if (agreeCheckbox) {
    agreeCheckbox.addEventListener("change", function () {
        continueBtn.disabled = !agreeCheckbox.checked;
    });
}

// Only the creator acknowledges these rules (see chat) - a joiner who
// somehow lands here, or a creator who's already acknowledged, gets sent
// straight to team-select.html instead.
apiFetch("/api/matches/" + matchId)
    .then(function (data) {
        if (!data.success || !data.match) {
            alert(data.message || "Could not load this match.");
            window.location.href = "match-board.html";
            return;
        }

        const match = data.match;

        if (match.creatorUsername !== username) {
            window.location.href = "match-board.html";
            return;
        }

        if (match.rulesAcknowledgedAt) {
            window.location.href = "team-select.html";
        }
    })
    .catch(function (error) {
        console.log("LOAD MATCH ERROR:", error);
        alert("Could not load this match. Make sure your backend is running.");
        window.location.href = "match-board.html";
    });

if (continueBtn) {
    continueBtn.addEventListener("click", function () {
        if (continueBtn.disabled) return;

        continueBtn.disabled = true;
        continueBtn.textContent = "SAVING...";

        apiFetch("/api/matches/" + matchId + "/acknowledge-rules", {
            method: "POST",
            body: JSON.stringify({})
        })
            .then(function (data) {
                if (!data.success) {
                    alert(data.message || "Could not save your acknowledgment.");

                    continueBtn.disabled = false;
                    continueBtn.textContent = "ACKNOWLEDGE & CONTINUE";
                    return;
                }

                window.location.href = "team-select.html";
            })
            .catch(function (error) {
                console.log("ACKNOWLEDGE RULES ERROR:", error);

                alert("Could not save your acknowledgment. Make sure your backend is running.");

                continueBtn.disabled = false;
                continueBtn.textContent = "ACKNOWLEDGE & CONTINUE";
            });
    });
}
