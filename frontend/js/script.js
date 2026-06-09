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

    let apiUrl = "https://api.pryzepot.com/api/login";

    const requestBody = {
        email: email,
        password: password
    };

    if (isSignupMode) {
        apiUrl = "https://api.pryzepot.com/api/signup";
        requestBody.username = username;
    }

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    })
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        if (!data.success) {
            alert(data.message);

            signInButton.textContent =
                isSignupMode ? "CREATE ACCOUNT" : "SIGN IN";

            signInButton.disabled = false;
            return;
        }

        localStorage.setItem("username", data.user.username);
        localStorage.setItem("balance", data.user.balance);

        fetch(
            "https://api.pryzepot.com/api/users/" +
            data.user.username +
            "/profile"
        )
        .then(function (response) {
            return response.json();
        })
        .then(function (profileData) {
            if (
                profileData.success &&
                profileData.user.clash_tag
            ) {
                localStorage.setItem(
                    "clashPlayerTag",
                    profileData.user.clash_tag
                );

                localStorage.setItem(
                    "clashPlayerName",
                    profileData.user.clash_name || ""
                );

                localStorage.setItem(
                    "clashFriendLink",
                    profileData.user.clash_friend_link || ""
                );

                localStorage.setItem(
                    "clashTrophies",
                    profileData.user.clash_trophies || 0
                );

                localStorage.setItem(
                    "clashExpLevel",
                    profileData.user.clash_exp_level || 0
                );
            } else {
                localStorage.removeItem("clashPlayerTag");
                localStorage.removeItem("clashPlayerName");
                localStorage.removeItem("clashFriendLink");
                localStorage.removeItem("clashTrophies");
                localStorage.removeItem("clashExpLevel");
            }

            window.location.href = "../html/home.html";
        })
        .catch(function (error) {
            console.log("PROFILE LOAD ERROR:", error);
            window.location.href = "../html/home.html";
        });
    })
    .catch(function (error) {
        console.log("LOGIN ERROR:", error);

        alert("Something went wrong logging in.");

        signInButton.textContent =
            isSignupMode ? "CREATE ACCOUNT" : "SIGN IN";

        signInButton.disabled = false;
    });
});