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
const confirmNewPasswordInput = document.getElementById("confirmNewPasswordInput");
const changePasswordBtn = document.getElementById("changePasswordBtn");

if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", function () {
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showToast("Enter your current password and new password twice.", "error");
            return;
        }

        if (newPassword.length < 6) {
            showToast("New password must be at least 6 characters.", "error");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showToast("New passwords don't match.", "error");
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
                confirmNewPasswordInput.value = "";
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

const deletePasswordInput = document.getElementById("deletePasswordInput");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", function () {
        const currentPassword = deletePasswordInput.value;

        if (!currentPassword) {
            showToast("Enter your current password.", "error");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to PERMANENTLY delete your account? This cannot be undone, even by reactivating."
        );

        if (!confirmed) return;

        deleteAccountBtn.disabled = true;
        deleteAccountBtn.textContent = "DELETING...";

        apiFetch("/api/users/delete-account", {
            method: "POST",
            body: JSON.stringify({
                currentPassword: currentPassword
            })
        })
            .then(function (data) {
                if (!data.success) {
                    deleteAccountBtn.disabled = false;
                    deleteAccountBtn.textContent = "PERMANENTLY DELETE ACCOUNT";
                    showToast(data.message || "Could not delete account.", "error");
                    return;
                }

                localStorage.clear();
                window.location.href = "index.html";
            })
            .catch(function (error) {
                console.log("DELETE ACCOUNT ERROR:", error);
                deleteAccountBtn.disabled = false;
                deleteAccountBtn.textContent = "PERMANENTLY DELETE ACCOUNT";
                showToast("Could not delete account.", "error");
            });
    });
}
