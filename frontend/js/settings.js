const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backBtn = document.getElementById("backBtn");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

const newEmailInput = document.getElementById("newEmailInput");
const emailPasswordInput = document.getElementById("emailPasswordInput");
const changeEmailBtn = document.getElementById("changeEmailBtn");

if (changeEmailBtn) {
    changeEmailBtn.addEventListener("click", function () {
        const newEmail = newEmailInput.value.trim();
        const currentPassword = emailPasswordInput.value;

        if (!newEmail || !currentPassword) {
            showToast("Enter your new email and current password.", "error");
            return;
        }

        changeEmailBtn.disabled = true;
        changeEmailBtn.textContent = "UPDATING...";

        apiFetch("/api/users/change-email", {
            method: "POST",
            body: JSON.stringify({
                newEmail: newEmail,
                currentPassword: currentPassword
            })
        })
            .then(function (data) {
                changeEmailBtn.disabled = false;
                changeEmailBtn.textContent = "UPDATE EMAIL";

                if (!data.success) {
                    showToast(data.message || "Could not update email.", "error");
                    return;
                }

                emailPasswordInput.value = "";
                showToast("Email updated.", "success");
            })
            .catch(function (error) {
                console.log("CHANGE EMAIL ERROR:", error);
                changeEmailBtn.disabled = false;
                changeEmailBtn.textContent = "UPDATE EMAIL";
                showToast("Could not update email.", "error");
            });
    });
}

const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const changePasswordBtn = document.getElementById("changePasswordBtn");

if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", function () {
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;

        if (!currentPassword || !newPassword) {
            showToast("Enter your current and new password.", "error");
            return;
        }

        if (newPassword.length < 6) {
            showToast("New password must be at least 6 characters.", "error");
            return;
        }

        changePasswordBtn.disabled = true;
        changePasswordBtn.textContent = "UPDATING...";

        apiFetch("/api/users/change-password", {
            method: "POST",
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        })
            .then(function (data) {
                changePasswordBtn.disabled = false;
                changePasswordBtn.textContent = "UPDATE PASSWORD";

                if (!data.success) {
                    showToast(data.message || "Could not update password.", "error");
                    return;
                }

                currentPasswordInput.value = "";
                newPasswordInput.value = "";
                showToast("Password updated.", "success");
            })
            .catch(function (error) {
                console.log("CHANGE PASSWORD ERROR:", error);
                changePasswordBtn.disabled = false;
                changePasswordBtn.textContent = "UPDATE PASSWORD";
                showToast("Could not update password.", "error");
            });
    });
}

const deactivatePasswordInput = document.getElementById("deactivatePasswordInput");
const deactivateBtn = document.getElementById("deactivateBtn");

if (deactivateBtn) {
    deactivateBtn.addEventListener("click", function () {
        const currentPassword = deactivatePasswordInput.value;

        if (!currentPassword) {
            showToast("Enter your current password.", "error");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to deactivate your account? You will be signed out and won't be able to log back in."
        );

        if (!confirmed) return;

        deactivateBtn.disabled = true;
        deactivateBtn.textContent = "DEACTIVATING...";

        apiFetch("/api/users/deactivate", {
            method: "POST",
            body: JSON.stringify({
                currentPassword: currentPassword
            })
        })
            .then(function (data) {
                if (!data.success) {
                    deactivateBtn.disabled = false;
                    deactivateBtn.textContent = "DEACTIVATE ACCOUNT";
                    showToast(data.message || "Could not deactivate account.", "error");
                    return;
                }

                localStorage.clear();
                window.location.href = "index.html";
            })
            .catch(function (error) {
                console.log("DEACTIVATE ACCOUNT ERROR:", error);
                deactivateBtn.disabled = false;
                deactivateBtn.textContent = "DEACTIVATE ACCOUNT";
                showToast("Could not deactivate account.", "error");
            });
    });
}
