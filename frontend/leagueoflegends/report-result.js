const backBtn = document.getElementById("backBtn");

const reportSection = document.getElementById("reportSection");
const reportWinBtn = document.getElementById("reportWinBtn");
const reportLossBtn = document.getElementById("reportLossBtn");

const waitingReportSection = document.getElementById("waitingReportSection");

const disputeSection = document.getElementById("disputeSection");
const disputeReasonInput = document.getElementById("disputeReasonInput");
const submitDisputeBtn = document.getElementById("submitDisputeBtn");

const underReviewSection = document.getElementById("underReviewSection");

const username = localStorage.getItem("username");
const matchId = localStorage.getItem("currentMatchId");

let pollTimer = null;
let handingOffToResults = false;

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

const ALL_SECTIONS = [
    reportSection, waitingReportSection, disputeSection, underReviewSection
];

function showSection(section) {
    ALL_SECTIONS.forEach(function (s) {
        if (s) s.classList.add("hidden");
    });

    if (section) section.classList.remove("hidden");
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// Same handoff Clash/Chess/Madden use once a match completes - stash the
// full match and let match-results.html render the shared winner/loser
// screen, instead of a bare inline message. Guards on handingOffToResults
// since render() can fire again from the 5s poll before the redirect
// actually unloads the page.
function goToResults() {
    if (handingOffToResults) return;
    handingOffToResults = true;

    stopPolling();

    apiFetch("/api/matches/" + matchId)
        .then(function (data) {
            if (data.success && data.match) {
                localStorage.setItem("lastVerifiedMatch", JSON.stringify(data.match));
            }

            window.location.href = "match-results.html";
        })
        .catch(function (error) {
            console.log("LOAD COMPLETED MATCH ERROR:", error);
            window.location.href = "match-results.html";
        });
}

function render(data) {
    if (data.matchStatus === "Completed") {
        goToResults();
        return;
    }

    if (!data.myReport) {
        showSection(reportSection);
        return;
    }

    if (!data.theirReportSubmitted) {
        showSection(waitingReportSection);
        return;
    }

    // Both reports are in and they didn't agree (agreement flips
    // matchStatus straight to Completed, handled above) - no screenshots
    // for this game, straight to filing a dispute with the admin team.
    showSection(data.disputeFiled ? underReviewSection : disputeSection);
}

function loadStatus() {
    apiFetch("/api/matches/" + matchId + "/result-status")
        .then(function (data) {
            if (!data.success) {
                alert(data.message || "Could not load this match.");
                window.location.href = "match-board.html";
                return;
            }

            render(data);
        })
        .catch(function (error) {
            console.log("RESULT STATUS ERROR:", error);
        });
}

function pollStatus() {
    if (pollTimer) return;

    pollTimer = setInterval(loadStatus, 5000);
}

if (reportWinBtn) {
    reportWinBtn.addEventListener("click", function () {
        submitReport("win");
    });
}

if (reportLossBtn) {
    reportLossBtn.addEventListener("click", function () {
        submitReport("loss");
    });
}

function submitReport(result) {
    reportWinBtn.disabled = true;
    reportLossBtn.disabled = true;

    apiFetch("/api/matches/" + matchId + "/report-result", {
        method: "POST",
        body: JSON.stringify({ result: result })
    })
        .then(function (data) {
            reportWinBtn.disabled = false;
            reportLossBtn.disabled = false;

            if (!data.success) {
                alert(data.message || "Could not submit your result.");
                return;
            }

            loadStatus();
        })
        .catch(function (error) {
            console.log("REPORT RESULT ERROR:", error);

            alert("Could not submit your result. Make sure your backend is running.");

            reportWinBtn.disabled = false;
            reportLossBtn.disabled = false;
        });
}

if (disputeReasonInput) {
    disputeReasonInput.addEventListener("input", function () {
        submitDisputeBtn.disabled = disputeReasonInput.value.trim().length < 10;
    });
}

if (submitDisputeBtn) {
    submitDisputeBtn.addEventListener("click", function () {
        const reason = disputeReasonInput.value.trim();

        if (reason.length < 10) return;

        submitDisputeBtn.disabled = true;
        submitDisputeBtn.textContent = "SUBMITTING...";

        const formData = new FormData();
        formData.append("matchType", "match");
        formData.append("matchId", matchId);
        formData.append("reason", reason);

        apiFetchForm("/api/disputes", formData)
            .then(function (data) {
                if (!data.success) {
                    alert(data.message || "Could not submit dispute.");

                    submitDisputeBtn.disabled = false;
                    submitDisputeBtn.textContent = "SUBMIT TO ADMIN";
                    return;
                }

                loadStatus();
            })
            .catch(function (error) {
                console.log("DISPUTE SUBMIT ERROR:", error);

                alert("Could not submit dispute. Make sure your backend is running.");

                submitDisputeBtn.disabled = false;
                submitDisputeBtn.textContent = "SUBMIT TO ADMIN";
            });
    });
}

loadStatus();
pollStatus();
