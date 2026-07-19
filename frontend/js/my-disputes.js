const backButton = document.getElementById("backButton");
const disputesContainer = document.getElementById("disputesContainer");

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

const RESOLUTION_LABELS = {
    refund_both: "Both players refunded",
    award_disputer: "You were awarded the entry fee",
    dismiss: "Dispute dismissed",
    manual: "Resolved manually"
};

function formatDate(timestamp) {
    if (!timestamp) return "";
    return new Date(Number(timestamp)).toLocaleString();
}

function renderDisputes(disputes) {
    if (disputes.length === 0) {
        disputesContainer.innerHTML = '<p class="empty-state">You haven\'t submitted any disputes.</p>';
        return;
    }

    disputesContainer.innerHTML = disputes.map(function (dispute, index) {
        const statusLabel = dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1);

        return `
            <div class="dispute-list-item" style="animation-delay:${index * 60}ms">
                <span class="status-pill ${dispute.status}">${statusLabel}</span>
                <p class="reason-text">${dispute.reason}</p>
                <div class="meta">Submitted ${formatDate(dispute.created_at)}</div>
                ${dispute.status === "resolved" ? `
                    <div class="resolution-text">
                        <strong>${RESOLUTION_LABELS[dispute.resolution_action] || "Resolved"}</strong>
                        ${dispute.resolution_notes ? "<br>" + dispute.resolution_notes : ""}
                    </div>
                ` : ""}
            </div>
        `;
    }).join("");
}

apiFetch("/api/disputes/mine")
    .then(function (data) {
        if (!data.success) {
            disputesContainer.innerHTML = '<p class="empty-state">Could not load your disputes.</p>';
            return;
        }

        renderDisputes(data.disputes || []);
    })
    .catch(function (error) {
        console.log("LOAD DISPUTES ERROR:", error);
        disputesContainer.innerHTML = '<p class="empty-state">Could not load your disputes.</p>';
    });
