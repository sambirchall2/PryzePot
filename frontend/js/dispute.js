const backButton = document.getElementById("backButton");
const reasonInput = document.getElementById("reasonInput");
const evidenceInput = document.getElementById("evidenceInput");
const fileList = document.getElementById("fileList");
const errorText = document.getElementById("errorText");
const submitBtn = document.getElementById("submitBtn");

const urlParams = new URLSearchParams(window.location.search);
const matchType = urlParams.get("type");
const matchId = urlParams.get("id");

if (!matchType || !matchId) {
    window.location.href = "home.html";
}

if (backButton) {
    backButton.addEventListener("click", function () {
        window.history.back();
    });
}

function showError(message) {
    errorText.textContent = message;
    errorText.classList.remove("hidden");
}

function hideError() {
    errorText.classList.add("hidden");
}

evidenceInput.addEventListener("change", function () {
    if (evidenceInput.files.length > 3) {
        showError("You can attach up to 3 files.");
        evidenceInput.value = "";
        fileList.textContent = "";
        return;
    }

    hideError();

    const names = Array.from(evidenceInput.files).map(function (file) {
        return file.name;
    });

    fileList.textContent = names.join(", ");
});

submitBtn.addEventListener("click", function () {
    const reason = reasonInput.value.trim();

    if (reason.length < 10) {
        showError("Please explain your dispute in a bit more detail.");
        return;
    }

    hideError();
    submitBtn.textContent = "SUBMITTING...";
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append("matchType", matchType);
    formData.append("matchId", matchId);
    formData.append("reason", reason);

    Array.from(evidenceInput.files).forEach(function (file) {
        formData.append("evidence", file);
    });

    apiFetchForm("/api/disputes", formData)
        .then(function (data) {
            if (!data.success) {
                showError(data.message || "Could not submit dispute.");
                submitBtn.textContent = "SUBMIT DISPUTE";
                submitBtn.disabled = false;
                return;
            }

            window.location.href = "my-disputes.html";
        })
        .catch(function (error) {
            console.log("DISPUTE SUBMIT ERROR:", error);
            showError("Something went wrong. Please try again.");
            submitBtn.textContent = "SUBMIT DISPUTE";
            submitBtn.disabled = false;
        });
});
