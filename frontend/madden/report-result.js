const backBtn = document.getElementById("backBtn");

const reportSection = document.getElementById("reportSection");
const reportWinBtn = document.getElementById("reportWinBtn");
const reportLossBtn = document.getElementById("reportLossBtn");

const waitingReportSection = document.getElementById("waitingReportSection");

const screenshotSection = document.getElementById("screenshotSection");
const screenshotInput = document.getElementById("screenshotInput");
const uploadScreenshotBtn = document.getElementById("uploadScreenshotBtn");

const waitingScreenshotSection = document.getElementById("waitingScreenshotSection");
const reviewSection = document.getElementById("reviewSection");

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
    reportSection, waitingReportSection, screenshotSection,
    waitingScreenshotSection, reviewSection
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

// Same handoff Clash/Chess use once a match completes (see
// frontend/clash/match-room.js) - stash the full match (with
// creatorProfile/opponentProfile already attached by GET /api/matches/:id)
// and let match-results.html render the shared winner/loser screen, instead
// of a bare inline message. Guards on handingOffToResults since render()
// can fire again from the 5s poll before the redirect actually unloads
// the page.
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

    // Both reports are in at this point - if verificationStatus is still
    // "pending" here (not Completed above), the reports disagreed and
    // screenshots are what's needed next (see server.js's report-result
    // handler - agreement flips matchStatus straight to Completed).
    if (data.verificationStatus === "needs_review") {
        showSection(reviewSection);
        return;
    }

    if (data.myScreenshotUploaded) {
        showSection(waitingScreenshotSection);
    } else {
        showSection(screenshotSection);
    }
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

if (screenshotInput) {
    screenshotInput.addEventListener("change", function () {
        uploadScreenshotBtn.disabled = !screenshotInput.files || screenshotInput.files.length === 0;
    });
}

if (uploadScreenshotBtn) {
    uploadScreenshotBtn.addEventListener("click", function () {
        const file = screenshotInput.files && screenshotInput.files[0];
        if (!file) return;

        uploadScreenshotBtn.disabled = true;
        uploadScreenshotBtn.textContent = "UPLOADING...";

        const formData = new FormData();
        formData.append("screenshot", file);

        apiFetchForm("/api/matches/" + matchId + "/screenshot", formData)
            .then(function (data) {
                if (!data.success) {
                    alert(data.message || "Could not upload screenshot.");

                    uploadScreenshotBtn.disabled = false;
                    uploadScreenshotBtn.textContent = "UPLOAD SCREENSHOT";
                    return;
                }

                loadStatus();
            })
            .catch(function (error) {
                console.log("SCREENSHOT UPLOAD ERROR:", error);

                alert("Could not upload screenshot. Make sure your backend is running.");

                uploadScreenshotBtn.disabled = false;
                uploadScreenshotBtn.textContent = "UPLOAD SCREENSHOT";
            });
    });
}

loadStatus();
pollStatus();
