const loginGate = document.getElementById("loginGate");
const adminShell = document.getElementById("adminShell");
const backButton = document.getElementById("backButton");

const adminEmailInput = document.getElementById("adminEmailInput");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const loginErrorText = document.getElementById("loginErrorText");

const disputeList = document.getElementById("disputeList");
const disputeDetail = document.getElementById("disputeDetail");

let allDisputes = [];
let selectedDisputeId = null;

const gameVerificationList = document.getElementById("gameVerificationList");
const manualDisputeList = document.getElementById("manualDisputeList");
const manualDisputeDetail = document.getElementById("manualDisputeDetail");

let allManualDisputes = [];
let selectedManualDisputeId = null;

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "../html/home.html";
    });
}

/* ---------- admin session fetch helper ---------- */

function adminFetch(path, options) {
    options = options || {};

    const headers = Object.assign(
        { "Content-Type": "application/json" },
        options.headers || {}
    );

    const token = localStorage.getItem("adminToken");

    if (token) {
        headers.Authorization = "Bearer " + token;
    }

    return fetch(API_BASE_URL + path, Object.assign({}, options, { headers: headers }))
        .then(function (response) {
            if (response.status === 401) {
                localStorage.removeItem("adminToken");
                showLoginGate();
                throw new Error("Admin session expired");
            }

            return response.json();
        });
}

function showLoginGate() {
    adminShell.classList.add("hidden");
    loginGate.classList.remove("hidden");
}

function showAdminShell() {
    loginGate.classList.add("hidden");
    adminShell.classList.remove("hidden");
    loadDisputes();
}

/* ---------- admin login ---------- */

adminLoginBtn.addEventListener("click", function () {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
        loginErrorText.textContent = "Enter your email and password.";
        return;
    }

    loginErrorText.textContent = "";
    adminLoginBtn.textContent = "SIGNING IN...";
    adminLoginBtn.disabled = true;

    fetch(API_BASE_URL + "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            adminLoginBtn.textContent = "SIGN IN";
            adminLoginBtn.disabled = false;

            if (!data.success) {
                loginErrorText.textContent = data.message || "Could not sign in.";
                return;
            }

            localStorage.setItem("adminToken", data.token);
            adminPasswordInput.value = "";
            showAdminShell();
        })
        .catch(function (error) {
            console.log("ADMIN LOGIN ERROR:", error);
            adminLoginBtn.textContent = "SIGN IN";
            adminLoginBtn.disabled = false;
            loginErrorText.textContent = "Something went wrong. Please try again.";
        });
});

/* ---------- tabs ---------- */

document.querySelectorAll(".tab-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        document.querySelectorAll(".tab-btn").forEach(function (b) {
            b.classList.remove("active");
        });
        document.querySelectorAll(".tab-panel").forEach(function (panel) {
            panel.classList.add("hidden");
        });

        button.classList.add("active");
        document.getElementById(button.dataset.tab + "Tab").classList.remove("hidden");

        // Reload on every visit (not just once) so an admin switching back
        // to either queue always sees current state, not a stale snapshot.
        if (button.dataset.tab === "gameVerification") loadGameVerifications();
        if (button.dataset.tab === "manualDisputes") loadManualDisputes();
    });
});

/* ---------- disputes ---------- */

function formatDate(timestamp) {
    if (!timestamp) return "";
    return new Date(Number(timestamp)).toLocaleString();
}

function loadDisputes() {
    adminFetch("/api/admin/disputes")
        .then(function (data) {
            if (!data.success) return;

            allDisputes = data.disputes || [];
            renderDisputeList();
        })
        .catch(function (error) {
            console.log("LOAD DISPUTES ERROR:", error);
        });
}

function renderDisputeList() {
    if (allDisputes.length === 0) {
        disputeList.innerHTML = '<p class="empty-hint">No disputes yet.</p>';
        return;
    }

    disputeList.innerHTML = allDisputes.map(function (dispute) {
        const preview = dispute.reason.length > 70 ? dispute.reason.slice(0, 70) + "..." : dispute.reason;

        return `
            <div class="dispute-row ${dispute.id === selectedDisputeId ? "selected" : ""}" data-id="${dispute.id}">
                <span class="status-pill ${dispute.status}">${dispute.status}</span>
                <div class="row-title">${dispute.disputing_username} — ${dispute.match_type} #${dispute.match_id}</div>
                <div class="row-preview">${preview}</div>
            </div>
        `;
    }).join("");

    disputeList.querySelectorAll(".dispute-row").forEach(function (row) {
        row.addEventListener("click", function () {
            selectedDisputeId = Number(row.dataset.id);
            renderDisputeList();
            loadDisputeDetail(selectedDisputeId);
        });
    });
}

function loadDisputeDetail(disputeId) {
    disputeDetail.innerHTML = '<p class="empty-hint">Loading...</p>';

    adminFetch("/api/admin/disputes/" + disputeId)
        .then(function (data) {
            if (!data.success) {
                disputeDetail.innerHTML = '<p class="empty-hint">Could not load this dispute.</p>';
                return;
            }

            renderDisputeDetail(data);
        })
        .catch(function (error) {
            console.log("LOAD DISPUTE DETAIL ERROR:", error);
            disputeDetail.innerHTML = '<p class="empty-hint">Could not load this dispute.</p>';
        });
}

function renderDisputeDetail(data) {
    const dispute = data.dispute;
    const match = data.match;
    const entryFee = Number(data.entryFee) || 0;

    const evidenceHtml = (data.evidenceUrls || []).map(function (url) {
        const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(url);
        return isVideo
            ? `<video src="${url}" controls></video>`
            : `<img src="${url}" alt="Evidence">`;
    }).join("");

    const matchSummary = match
        ? `Entry fee: ${entryFee.toLocaleString()} · Status: ${match.status} · Winner: ${match.winner_username || "—"}`
        : "Match not found.";

    const resolvedHtml = dispute.status === "resolved"
        ? `<div class="detail-section">
               <p class="detail-label">Resolution</p>
               <p class="detail-value">${dispute.resolution_action} by ${dispute.resolved_by} on ${formatDate(dispute.resolved_at)}${dispute.resolution_notes ? " — " + dispute.resolution_notes : ""}</p>
           </div>`
        : "";

    // Madden-only context (team picks, rules ack, and the bot's own
    // screenshot reading) so this one screen has everything needed to
    // decide - see chat. Empty string for every other game.
    const maddenHtml = (match && match.game === "Madden NFL") ? `
        <div class="detail-section">
            <p class="detail-label">Madden Match Details</p>
            <p class="detail-value">
                Platform: ${match.platform || "—"} · Skill: ${match.skill_difficulty || "—"}<br>
                ${match.creator_username}'s team: ${match.creator_team_selection || "not picked"}<br>
                ${match.opponent_username}'s team: ${match.opponent_team_selection || "not picked"}<br>
                Rules acknowledged: ${match.rules_acknowledged_at ? formatDate(match.rules_acknowledged_at) : "not yet"}<br>
                Setup ready: ${match.setup_ready_at ? formatDate(match.setup_ready_at) : "not yet"}
            </p>
        </div>

        ${data.maddenVerification ? `
            <div class="detail-section">
                <p class="detail-label">Match Verification</p>
                <p class="detail-value">
                    Status: ${data.maddenVerification.status} · Queue: ${data.maddenVerification.queue_tag || "—"}<br>
                    Resolution method: ${data.maddenVerification.resolution_method || "—"} · Winner: ${data.maddenVerification.winner_username || "—"}
                </p>
            </div>
        ` : ""}

        ${(data.maddenScreenshots || []).length > 0 ? `
            <div class="detail-section">
                <p class="detail-label">Uploaded Screenshots</p>
                <div class="evidence-grid">
                    ${data.maddenScreenshots.map(function (shot) {
                        return `<div>
                            ${shot.url ? `<img src="${shot.url}" alt="Screenshot from ${shot.playerUsername}">` : "<p class='detail-value'>Could not load image.</p>"}
                            <p class="detail-value" style="font-size:12px;">
                                ${shot.playerUsername}: ${shot.botExtractedTeam1 || "?"} ${shot.botExtractedScore1 || ""} - ${shot.botExtractedTeam2 || "?"} ${shot.botExtractedScore2 || ""}
                                (${shot.botReadStatus})${shot.botConfidenceNotes ? " — " + shot.botConfidenceNotes : ""}
                            </p>
                        </div>`;
                    }).join("")}
                </div>
            </div>
        ` : ""}
    ` : "";

    disputeDetail.innerHTML = `
        <div class="detail-section">
            <p class="detail-label">Disputing player</p>
            <p class="detail-value">${dispute.disputing_username}</p>
        </div>

        <div class="detail-section">
            <p class="detail-label">Match (${dispute.match_type} #${dispute.match_id})</p>
            <p class="detail-value">${matchSummary}</p>
        </div>

        ${maddenHtml}

        <div class="detail-section">
            <p class="detail-label">Reason</p>
            <p class="detail-value">${dispute.reason}</p>
        </div>

        <div class="detail-section">
            <p class="detail-label">Evidence</p>
            <div class="evidence-grid">${evidenceHtml || "<p class='detail-value'>No evidence attached.</p>"}</div>
        </div>

        ${resolvedHtml}

        ${dispute.status !== "resolved" ? `
            <div class="detail-section">
                <p class="detail-label">Resolve</p>
                <div class="resolution-actions">
                    <button class="action-btn primary" data-action="refund_both">Refund Both (${entryFee.toLocaleString()} each)</button>
                    <button class="action-btn primary" data-action="award_disputer">Award Disputer (${entryFee.toLocaleString()})</button>
                    <button class="action-btn" data-action="dismiss">Dismiss</button>
                </div>
                <input id="resolutionNotes" class="tool-input" type="text" placeholder="Notes (optional)">
                <button id="manualResolveBtn" class="action-btn">Manual Amount Instead</button>
                <div id="manualResolveForm" class="hidden" style="margin-top:10px;">
                    <input id="manualUsernameInput" class="tool-input" type="text" placeholder="Username to send to">
                    <input id="manualAmountInput" class="tool-input" type="number" placeholder="Amount">
                    <button class="action-btn primary" data-action="manual">Send Manual Amount</button>
                </div>
            </div>
        ` : ""}
    `;

    disputeDetail.querySelectorAll("[data-action]").forEach(function (button) {
        button.addEventListener("click", function () {
            resolveDispute(dispute.id, button.dataset.action);
        });
    });

    const manualResolveBtn = document.getElementById("manualResolveBtn");
    const manualResolveForm = document.getElementById("manualResolveForm");

    if (manualResolveBtn) {
        manualResolveBtn.addEventListener("click", function () {
            manualResolveForm.classList.toggle("hidden");
        });
    }
}

function resolveDispute(disputeId, action) {
    const notesInput = document.getElementById("resolutionNotes");
    const notes = notesInput ? notesInput.value.trim() : "";

    const body = { action: action, notes: notes };

    if (action === "manual") {
        const manualUsername = document.getElementById("manualUsernameInput").value.trim();
        const manualAmount = document.getElementById("manualAmountInput").value;

        if (!manualUsername || !manualAmount) {
            alert("Enter a username and amount for a manual resolution.");
            return;
        }

        body.manualUsername = manualUsername;
        body.manualAmount = manualAmount;
    }

    const actionLabel = action.replace("_", " ");

    if (!confirm("Resolve this dispute with action: " + actionLabel + "?")) {
        return;
    }

    adminFetch("/api/admin/disputes/" + disputeId + "/resolve", {
        method: "POST",
        body: JSON.stringify(body)
    })
        .then(function (data) {
            if (!data.success) {
                alert(data.message || "Could not resolve dispute.");
                return;
            }

            loadDisputes();
            loadDisputeDetail(disputeId);
        })
        .catch(function (error) {
            console.log("RESOLVE DISPUTE ERROR:", error);
            alert("Something went wrong resolving this dispute.");
        });
}

/* ---------- game verification (routine queue) ---------- */

function loadGameVerifications() {
    gameVerificationList.innerHTML = '<p class="empty-hint">Loading...</p>';

    adminFetch("/api/admin/game-verifications")
        .then(function (data) {
            if (!data.success) {
                gameVerificationList.innerHTML = '<p class="empty-hint">Could not load the queue.</p>';
                return;
            }

            renderGameVerificationList(data.items || []);
        })
        .catch(function (error) {
            console.log("LOAD GAME VERIFICATIONS ERROR:", error);
            gameVerificationList.innerHTML = '<p class="empty-hint">Could not load the queue.</p>';
        });
}

function screenshotForPlayer(screenshots, username) {
    return (screenshots || []).find(function (s) { return s.playerUsername === username; }) || null;
}

function verifySideHtml(username, shot) {
    if (!username) {
        return `<div class="verify-side"><div class="verify-player">—</div></div>`;
    }

    const extracted = shot
        ? `${shot.botExtractedTeam1 || "?"} ${shot.botExtractedScore1 ?? ""} - ${shot.botExtractedTeam2 || "?"} ${shot.botExtractedScore2 ?? ""}<br>` +
          `(${shot.botReadStatus || "not_processed"})${shot.botConfidenceNotes ? " — " + shot.botConfidenceNotes : ""}`
        : "No screenshot uploaded.";

    return `
        <div class="verify-side">
            ${shot && shot.url ? `<img src="${shot.url}" alt="Screenshot from ${username}">` : ""}
            <div class="verify-player">${username}</div>
            <div class="verify-extracted">${extracted}</div>
        </div>
    `;
}

function renderGameVerificationList(items) {
    if (items.length === 0) {
        gameVerificationList.innerHTML = '<p class="empty-hint">Nothing needs review right now.</p>';
        return;
    }

    gameVerificationList.innerHTML = items.map(function (item) {
        const match = item.match;
        const verification = item.verification;

        if (!match) {
            return `<div class="verify-card"><p class="detail-value">Match #${verification.match_id} not found.</p></div>`;
        }

        const creatorShot = screenshotForPlayer(item.screenshots, match.creator_username);
        const opponentShot = screenshotForPlayer(item.screenshots, match.opponent_username);

        return `
            <div class="verify-card" data-verification-id="${verification.id}">
                <div class="verify-card-header">
                    <span class="status-pill needs_review">needs review</span>
                    <span class="detail-value">Match #${match.id} · ${Number(match.entry_fee || 0).toLocaleString()} entry</span>
                </div>

                <div class="verify-matchup">
                    ${verifySideHtml(match.creator_username, creatorShot)}
                    <div class="verify-vs">VS</div>
                    ${verifySideHtml(match.opponent_username, opponentShot)}
                </div>

                <div class="verify-winner-actions">
                    <button class="action-btn primary" data-verification-id="${verification.id}" data-winner="${match.creator_username}">Winner: ${match.creator_username}</button>
                    <button class="action-btn primary" data-verification-id="${verification.id}" data-winner="${match.opponent_username}">Winner: ${match.opponent_username}</button>
                </div>
            </div>
        `;
    }).join("");

    gameVerificationList.querySelectorAll("[data-winner]").forEach(function (button) {
        button.addEventListener("click", function () {
            resolveMatchVerification(button.dataset.verificationId, button.dataset.winner, loadGameVerifications);
        });
    });
}

// Shared by both queues below - "select winner" behaves identically no
// matter which tab it was clicked from (see chat).
function resolveMatchVerification(verificationId, winnerUsername, onDone) {
    if (!confirm("Declare " + winnerUsername + " the winner of this match?")) return;

    adminFetch("/api/admin/match-verifications/" + verificationId + "/resolve", {
        method: "POST",
        body: JSON.stringify({ winnerUsername: winnerUsername })
    })
        .then(function (data) {
            if (!data.success) {
                alert(data.message || "Could not resolve this match.");
                return;
            }

            if (onDone) onDone();
        })
        .catch(function (error) {
            console.log("RESOLVE MATCH VERIFICATION ERROR:", error);
            alert("Something went wrong resolving this match.");
        });
}

/* ---------- disputes & cheating (investigation queue) ---------- */

function loadManualDisputes() {
    manualDisputeList.innerHTML = '<p class="empty-hint">Loading...</p>';

    adminFetch("/api/admin/manual-report-disputes")
        .then(function (data) {
            if (!data.success) {
                manualDisputeList.innerHTML = '<p class="empty-hint">Could not load cases.</p>';
                return;
            }

            allManualDisputes = data.verifications || [];
            renderManualDisputeList();
        })
        .catch(function (error) {
            console.log("LOAD MANUAL DISPUTES ERROR:", error);
            manualDisputeList.innerHTML = '<p class="empty-hint">Could not load cases.</p>';
        });
}

function renderManualDisputeList() {
    if (allManualDisputes.length === 0) {
        manualDisputeList.innerHTML = '<p class="empty-hint">No open cases.</p>';
        return;
    }

    manualDisputeList.innerHTML = allManualDisputes.map(function (verification) {
        return `
            <div class="dispute-row ${verification.id === selectedManualDisputeId ? "selected" : ""}" data-id="${verification.id}">
                <span class="status-pill dispute">dispute</span>
                <div class="row-title">Match #${verification.match_id}</div>
                <div class="row-preview">Filed ${formatDate(verification.created_at)}</div>
            </div>
        `;
    }).join("");

    manualDisputeList.querySelectorAll(".dispute-row").forEach(function (row) {
        row.addEventListener("click", function () {
            selectedManualDisputeId = Number(row.dataset.id);
            renderManualDisputeList();
            loadManualDisputeDetail(selectedManualDisputeId);
        });
    });
}

function loadManualDisputeDetail(verificationId) {
    manualDisputeDetail.innerHTML = '<p class="empty-hint">Loading...</p>';

    adminFetch("/api/admin/manual-report-disputes/" + verificationId)
        .then(function (data) {
            if (!data.success) {
                manualDisputeDetail.innerHTML = '<p class="empty-hint">Could not load this case.</p>';
                return;
            }

            renderManualDisputeDetail(data);
        })
        .catch(function (error) {
            console.log("LOAD MANUAL DISPUTE DETAIL ERROR:", error);
            manualDisputeDetail.innerHTML = '<p class="empty-hint">Could not load this case.</p>';
        });
}

function renderManualDisputeDetail(data) {
    const verification = data.verification;
    const match = data.match;

    const disputesHtml = (data.disputes || []).map(function (dispute) {
        const evidenceHtml = (dispute.evidenceUrls || []).map(function (url) {
            const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(url);
            return isVideo ? `<video src="${url}" controls></video>` : `<img src="${url}" alt="Evidence">`;
        }).join("");

        return `
            <div class="detail-section">
                <p class="detail-label">Dispute filed by ${dispute.disputing_username} (${dispute.status})</p>
                <p class="detail-value">${dispute.reason}</p>
                <div class="evidence-grid">${evidenceHtml || "<p class='detail-value'>No evidence attached.</p>"}</div>
            </div>
        `;
    }).join("") || `<div class="detail-section"><p class="detail-value">No linked dispute record found.</p></div>`;

    const reportsHtml = (data.reports || []).map(function (r) {
        return `${r.playerUsername}: ${r.reportedResult}`;
    }).join(" · ") || "Neither player has reported yet.";

    const screenshotsHtml = (data.screenshots || []).length > 0 ? `
        <div class="detail-section">
            <p class="detail-label">Uploaded Screenshots</p>
            <div class="evidence-grid">
                ${data.screenshots.map(function (shot) {
                    return `<div>
                        ${shot.url ? `<img src="${shot.url}" alt="Screenshot from ${shot.playerUsername}">` : "<p class='detail-value'>Could not load image.</p>"}
                        <p class="detail-value" style="font-size:12px;">
                            ${shot.playerUsername}: ${shot.botExtractedTeam1 || "?"} ${shot.botExtractedScore1 ?? ""} - ${shot.botExtractedTeam2 || "?"} ${shot.botExtractedScore2 ?? ""}
                            (${shot.botReadStatus})${shot.botConfidenceNotes ? " — " + shot.botConfidenceNotes : ""}
                        </p>
                    </div>`;
                }).join("")}
            </div>
        </div>
    ` : "";

    const matchDetailsHtml = match ? `
        <div class="detail-section">
            <p class="detail-label">Match #${match.id}</p>
            <p class="detail-value">
                Entry fee: ${Number(match.entry_fee || 0).toLocaleString()} · Status: ${match.status}<br>
                Platform: ${match.platform || "—"} · Skill: ${match.skill_difficulty || "—"}<br>
                ${match.creator_username}'s team: ${match.creator_team_selection || "not picked"}<br>
                ${match.opponent_username}'s team: ${match.opponent_team_selection || "not picked"}<br>
                Rules acknowledged: ${match.rules_acknowledged_at ? formatDate(match.rules_acknowledged_at) : "not yet"}<br>
                Self-reported results: ${reportsHtml}
            </p>
        </div>
    ` : `<div class="detail-section"><p class="detail-value">Underlying match not found.</p></div>`;

    const canResolve = match && verification.status !== "resolved_by_admin" && match.status !== "Completed";

    const resolveHtml = canResolve ? `
        <div class="detail-section">
            <p class="detail-label">Resolve (no penalty)</p>
            <div class="resolution-actions">
                <button class="action-btn primary" data-winner="${match.creator_username}">Winner: ${match.creator_username}</button>
                <button class="action-btn primary" data-winner="${match.opponent_username}">Winner: ${match.opponent_username}</button>
            </div>
        </div>
    ` : `<div class="detail-section"><p class="detail-value">Status: ${verification.status}${match && match.status === "Completed" ? " — already paid out, use the Disputes tab to correct it." : ""}</p></div>`;

    // Combined penalty (see chat): forfeits the match to the other player
    // (completeMaddenMatch - same payout path every resolution uses) AND
    // bans the offending account (same banUserAccount the plain Ban button
    // below calls) in one admin action instead of two separate clicks.
    const forfeitBanHtml = canResolve ? `
        <div class="detail-section">
            <p class="detail-label">Forfeit &amp; Ban (confirmed rules violation)</p>
            <div class="resolution-actions">
                <button class="action-btn danger" data-forfeit-ban="${match.creator_username}">Forfeit &amp; Ban ${match.creator_username}</button>
                <button class="action-btn danger" data-forfeit-ban="${match.opponent_username}">Forfeit &amp; Ban ${match.opponent_username}</button>
            </div>
        </div>
    ` : "";

    const banHtml = match ? `
        <div class="detail-section">
            <p class="detail-label">Ban Only (no match action)</p>
            <div class="resolution-actions">
                <button class="action-btn" data-ban="${match.creator_username}">Ban ${match.creator_username}</button>
                <button class="action-btn" data-ban="${match.opponent_username}">Ban ${match.opponent_username}</button>
            </div>
        </div>
    ` : "";

    const eventsHtml = (data.events || []).length > 0 ? `
        <div class="detail-section">
            <p class="detail-label">Activity Log</p>
            <p class="detail-value" style="font-size:12px; line-height:1.7;">
                ${data.events.map(function (e) {
                    return formatDate(e.createdAt) + " — " + describeVerificationEvent(e);
                }).join("<br>")}
            </p>
        </div>
    ` : "";

    manualDisputeDetail.innerHTML = `
        ${matchDetailsHtml}
        ${screenshotsHtml}
        ${disputesHtml}
        ${resolveHtml}
        ${forfeitBanHtml}
        ${banHtml}
        ${eventsHtml}
    `;

    manualDisputeDetail.querySelectorAll("[data-winner]").forEach(function (button) {
        button.addEventListener("click", function () {
            resolveMatchVerification(verification.id, button.dataset.winner, function () {
                loadManualDisputes();
                loadManualDisputeDetail(verification.id);
            });
        });
    });

    manualDisputeDetail.querySelectorAll("[data-forfeit-ban]").forEach(function (button) {
        button.addEventListener("click", function () {
            forfeitAndBan(verification.id, button.dataset.forfeitBan, function () {
                loadManualDisputes();
                loadManualDisputeDetail(verification.id);
            });
        });
    });

    manualDisputeDetail.querySelectorAll("[data-ban]").forEach(function (button) {
        button.addEventListener("click", function () {
            banPlayer(button.dataset.ban, "Madden match #" + verification.match_id + " dispute");
        });
    });
}

// Turns one match_verification_events row into a human-readable line for
// the Activity Log (see chat - "who reported what, what the bot extracted,
// who resolved it and when").
function describeVerificationEvent(e) {
    if (e.eventType === "result_reported") return (e.actorUsername || "player") + " self-" + e.details;
    if (e.eventType === "screenshot_uploaded") return (e.actorUsername || "player") + " " + e.details;
    if (e.eventType === "bot_extraction") return "Bot read: " + e.details;
    if (e.eventType === "disputed") return (e.actorUsername || "player") + " filed a dispute — " + e.details;

    if (e.eventType === "resolved") {
        return "Resolved (" + e.resolutionMethod + ")" +
            (e.actorUsername ? " by " + e.actorUsername : "") +
            " — winner: " + e.winnerUsername +
            (e.details ? " — " + e.details : "");
    }

    if (e.eventType === "penalty_applied") {
        return "PENALTY by " + (e.actorUsername || "admin") + " — " + e.details;
    }

    return e.eventType;
}

function forfeitAndBan(verificationId, offendingUsername, onDone) {
    const reason = prompt(
        "Forfeit this match to the other player and ban " + offendingUsername + " - reason:",
        "Madden match dispute - confirmed rules violation"
    );

    if (reason === null) return;
    if (!reason.trim()) {
        alert("A reason is required.");
        return;
    }

    if (!confirm("Forfeit this match to the other player AND ban " + offendingUsername + "? This applies both penalties immediately.")) return;

    adminFetch("/api/admin/match-verifications/" + verificationId + "/forfeit-and-ban", {
        method: "POST",
        body: JSON.stringify({ offendingUsername: offendingUsername, reason: reason.trim() })
    })
        .then(function (data) {
            alert(data.message || (data.success ? "Done." : "Could not apply this penalty."));

            if (data.success && onDone) onDone();
        })
        .catch(function (error) {
            console.log("FORFEIT AND BAN ERROR:", error);
            alert("Something went wrong applying this penalty.");
        });
}

function banPlayer(username, contextHint) {
    const reason = prompt("Ban " + username + " - reason (shown to no one but admins):", contextHint || "");

    if (reason === null) return;
    if (!reason.trim()) {
        alert("A reason is required to ban a player.");
        return;
    }

    if (!confirm("Ban " + username + "? They will not be able to log in.")) return;

    adminFetch("/api/admin/users/" + encodeURIComponent(username) + "/ban", {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() })
    })
        .then(function (data) {
            alert(data.message || (data.success ? "Player banned." : "Could not ban this player."));
        })
        .catch(function (error) {
            console.log("BAN PLAYER ERROR:", error);
            alert("Something went wrong banning this player.");
        });
}

/* ---------- send currency / XP tools ---------- */

function setupSearchTool(inputId, resultsId, onSelect) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    let debounceTimer = null;

    input.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (query.length < 2) {
            results.innerHTML = "";
            return;
        }

        debounceTimer = setTimeout(function () {
            adminFetch("/api/admin/users/search?q=" + encodeURIComponent(query))
                .then(function (data) {
                    if (!data.success) return;

                    results.innerHTML = (data.users || []).map(function (user) {
                        return `<div class="search-result-item" data-username="${user.username}">${user.username} — ${Number(user.balance).toLocaleString()} credits, Lvl ${user.level}</div>`;
                    }).join("");

                    results.querySelectorAll(".search-result-item").forEach(function (item) {
                        item.addEventListener("click", function () {
                            input.value = item.dataset.username;
                            results.innerHTML = "";
                            onSelect(item.dataset.username);
                        });
                    });
                })
                .catch(function (error) {
                    console.log("USER SEARCH ERROR:", error);
                });
        }, 250);
    });
}

setupSearchTool("currencyUsernameInput", "currencyResults", function () {});
setupSearchTool("xpUsernameInput", "xpResults", function () {});

document.getElementById("sendCurrencyBtn").addEventListener("click", function () {
    const username = document.getElementById("currencyUsernameInput").value.trim();
    const amount = document.getElementById("currencyAmountInput").value;
    const notes = document.getElementById("currencyNotesInput").value.trim();
    const resultText = document.getElementById("currencyResultText");

    if (!username || !amount) {
        resultText.textContent = "Enter a username and amount.";
        return;
    }

    if (!confirm("Send " + amount + " Vault Credits to " + username + "?")) {
        return;
    }

    adminFetch("/api/admin/grant-currency", {
        method: "POST",
        body: JSON.stringify({ username: username, amount: amount, notes: notes })
    })
        .then(function (data) {
            resultText.textContent = data.success
                ? "Sent. New balance: " + Number(data.balance).toLocaleString()
                : (data.message || "Could not send credits.");
        })
        .catch(function (error) {
            console.log("GRANT CURRENCY ERROR:", error);
            resultText.textContent = "Something went wrong.";
        });
});

document.getElementById("sendXpBtn").addEventListener("click", function () {
    const username = document.getElementById("xpUsernameInput").value.trim();
    const amount = document.getElementById("xpAmountInput").value;
    const notes = document.getElementById("xpNotesInput").value.trim();
    const resultText = document.getElementById("xpResultText");

    if (!username || !amount) {
        resultText.textContent = "Enter a username and XP amount.";
        return;
    }

    if (!confirm("Send " + amount + " XP to " + username + "?")) {
        return;
    }

    adminFetch("/api/admin/grant-xp", {
        method: "POST",
        body: JSON.stringify({ username: username, amount: amount, notes: notes })
    })
        .then(function (data) {
            resultText.textContent = data.success
                ? "XP sent."
                : (data.message || "Could not send XP.");
        })
        .catch(function (error) {
            console.log("GRANT XP ERROR:", error);
            resultText.textContent = "Something went wrong.";
        });
});

/* ---------- initial admin session check ---------- */

if (localStorage.getItem("adminToken")) {
    adminFetch("/api/admin/me")
        .then(function (data) {
            if (!data.success) {
                localStorage.removeItem("adminToken");
                showLoginGate();
                return;
            }

            showAdminShell();
        })
        .catch(function (error) {
            console.log("ADMIN SESSION CHECK ERROR:", error);
            showLoginGate();
        });
} else {
    showLoginGate();
}
