const continueBtn = document.getElementById("continueBtn");
const usernameInput = document.getElementById("usernameInput");
const errorText = document.getElementById("errorText");

const params = new URLSearchParams(window.location.hash.slice(1));
const pendingToken = params.get("pending");

if (!pendingToken) {
    window.location.href = "index.html";
}

history.replaceState(null, "", window.location.pathname);

function showError(message) {
    errorText.textContent = message;
    errorText.style.display = "block";
}

continueBtn.addEventListener("click", function () {
    const username = usernameInput.value.trim();

    if (username === "") {
        showError("Please enter a username.");
        return;
    }

    continueBtn.textContent = "LOADING...";
    continueBtn.disabled = true;
    errorText.style.display = "none";

    apiFetch("/api/auth/oauth-signup/complete", {
        method: "POST",
        body: JSON.stringify({ pendingToken: pendingToken, username: username })
    })
    .then(function (data) {
        if (!data.success) {
            showError(data.message);
            continueBtn.textContent = "CONTINUE";
            continueBtn.disabled = false;
            return;
        }

        localStorage.setItem("authToken", data.token);
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("balance", data.user.balance);

        window.location.href = "profile-setup.html";
    })
    .catch(function (error) {
        console.log("OAUTH SIGNUP ERROR:", error);
        showError("Something went wrong. Please try again.");
        continueBtn.textContent = "CONTINUE";
        continueBtn.disabled = false;
    });
});
