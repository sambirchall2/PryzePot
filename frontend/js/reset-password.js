const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const resetSubmitBtn = document.getElementById("resetSubmitBtn");
const resetSubtitle = document.getElementById("resetSubtitle");

const resetToken = new URLSearchParams(window.location.search).get("token");

if (!resetToken) {
    resetSubtitle.textContent = "This reset link is invalid. Please request a new one from the sign-in page.";
    newPasswordInput.style.display = "none";
    confirmPasswordInput.style.display = "none";
    resetSubmitBtn.style.display = "none";
}

if (resetSubmitBtn) {
    resetSubmitBtn.addEventListener("click", function () {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword === "" || confirmPassword === "") {
            alert("Please enter and confirm your new password.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        resetSubmitBtn.textContent = "RESETTING...";
        resetSubmitBtn.disabled = true;

        apiFetch("/api/reset-password", {
            method: "POST",
            body: JSON.stringify({ token: resetToken, newPassword: newPassword })
        })
        .then(function (data) {
            alert(data.message);

            if (data.success) {
                window.location.href = "index.html";
                return;
            }

            resetSubmitBtn.textContent = "RESET PASSWORD";
            resetSubmitBtn.disabled = false;
        })
        .catch(function (error) {
            console.log("RESET PASSWORD ERROR:", error);
            alert("Something went wrong. Please try again.");
            resetSubmitBtn.textContent = "RESET PASSWORD";
            resetSubmitBtn.disabled = false;
        });
    });
}
