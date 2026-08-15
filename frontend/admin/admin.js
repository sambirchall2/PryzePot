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

    disputeDetail.innerHTML = `
        <div class="detail-section">
            <p class="detail-label">Disputing player</p>
            <p class="detail-value">${dispute.disputing_username}</p>
        </div>

        <div class="detail-section">
            <p class="detail-label">Match (${dispute.match_type} #${dispute.match_id})</p>
            <p class="detail-value">${matchSummary}</p>
        </div>

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
