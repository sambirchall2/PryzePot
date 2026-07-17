const signInButton = document.getElementById("signInBtn");
const showSignupLink = document.getElementById("showSignupLink");
const usernameInput = document.getElementById("usernameInput");

let isSignupMode = false;

showSignupLink.addEventListener("click", function (event) {
    event.preventDefault();

    isSignupMode = !isSignupMode;

    if (isSignupMode) {
        usernameInput.style.display = "block";
        signInButton.textContent = "CREATE ACCOUNT";
        showSignupLink.textContent = "Sign in";
    } else {
        usernameInput.style.display = "none";
        signInButton.textContent = "SIGN IN";
        showSignupLink.textContent = "Sign up";
    }
});

function resetButton() {
    signInButton.textContent = isSignupMode ? "CREATE ACCOUNT" : "SIGN IN";
    signInButton.disabled = false;
}

function clearClashStorage() {
    localStorage.removeItem("clashPlayerTag");
    localStorage.removeItem("clashPlayerName");
    localStorage.removeItem("clashFriendLink");
    localStorage.removeItem("clashTrophies");
    localStorage.removeItem("clashExpLevel");
}

function saveProfileToLocalStorage(user) {
    localStorage.setItem("profilePicture", user.profile_picture || "avatar1");
    localStorage.setItem("profileBanner", user.profile_banner || "banner1");
    localStorage.setItem("profileCompleted", String(user.profile_completed || false));
    localStorage.setItem("xp", user.xp || 0);
    localStorage.setItem("level", user.level || 1);
}

function saveClashToLocalStorage(user) {
    if (user.clash_tag) {
        localStorage.setItem("clashPlayerTag", user.clash_tag);
        localStorage.setItem("clashPlayerName", user.clash_name || "");
        localStorage.setItem("clashFriendLink", user.clash_friend_link || "");
        localStorage.setItem("clashTrophies", user.clash_trophies || 0);
        localStorage.setItem("clashExpLevel", user.clash_exp_level || 0);
    } else {
        clearClashStorage();
    }
}

function completeLogin(token, username, balance) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("username", username);
    localStorage.setItem("balance", balance);

    apiFetch("/api/users/" + username + "/profile")
    .then(function (profileData) {
        if (!profileData.success || !profileData.user) {
            window.location.href = "../html/profile-setup.html";
            return;
        }

        saveClashToLocalStorage(profileData.user);
        saveProfileToLocalStorage(profileData.user);

        if (profileData.user.profile_completed) {
            window.location.href = "../html/home.html";
        } else {
            window.location.href = "../html/profile-setup.html";
        }
    })
    .catch(function (error) {
        console.log("PROFILE LOAD ERROR:", error);
        window.location.href = "../html/profile-setup.html";
    });
}

(function checkOAuthRedirect() {
    if (window.location.hash.indexOf("token=") === -1) {
        return;
    }

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");
    const username = params.get("username");
    const balance = params.get("balance");

    if (!token || !username) {
        return;
    }

    history.replaceState(null, "", window.location.pathname);
    completeLogin(token, username, balance);
})();

const googleSignInBtn = document.getElementById("googleSignInBtn");
const discordSignInBtn = document.getElementById("discordSignInBtn");

if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", function () {
        window.location.href = API_BASE_URL + "/api/auth/google";
    });
}

if (discordSignInBtn) {
    discordSignInBtn.addEventListener("click", function () {
        window.location.href = API_BASE_URL + "/api/auth/discord";
    });
}

signInButton.addEventListener("click", function () {
    const username = usernameInput.value.trim();
    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    if (isSignupMode && username === "") {
        alert("Please enter a username.");
        return;
    }

    if (email === "" || password === "") {
        alert("Please enter your email and password.");
        return;
    }

    signInButton.textContent = "LOADING...";
    signInButton.disabled = true;

    let apiPath = "/api/login";

    const requestBody = {
        email: email,
        password: password
    };

    if (isSignupMode) {
        apiPath = "/api/signup";
        requestBody.username = username;
    }

    apiFetch(apiPath, {
        method: "POST",
        body: JSON.stringify(requestBody)
    })
    .then(function (data) {
        if (!data.success) {
            alert(data.message);
            resetButton();
            return;
        }

        completeLogin(data.token, data.user.username, data.user.balance);
    })
    .catch(function (error) {
        console.log("LOGIN ERROR:", error);
        alert("Something went wrong logging in.");
        resetButton();
    });
});