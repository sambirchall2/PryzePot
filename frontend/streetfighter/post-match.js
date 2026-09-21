const backBtn = document.getElementById("backBtn");
const entryAmountDisplay = document.getElementById("entryAmountDisplay");
const capcomIdDisplay = document.getElementById("capcomIdDisplay");
const postMatchBtn = document.getElementById("postMatchBtn");

const username = localStorage.getItem("username");
const entryFee = localStorage.getItem("entryFee");
const capcomId = localStorage.getItem("capcomId");

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "rules.html";
    });
}

if (!username) {
    window.location.href = "../html/index.html";
}

if (!entryFee) {
    window.location.href = "entry.html";
}

if (!capcomId) {
    window.location.href = "connect-streetfighter.html";
}

entryAmountDisplay.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + entryFee;
capcomIdDisplay.textContent = capcomId;

postMatchBtn.addEventListener("click", function () {
    postMatchBtn.textContent = "POSTING...";
    postMatchBtn.disabled = true;

    const matchData = {
        game: "Street Fighter 6",
        playerTag: capcomId,
        entryFee: Number(entryFee)
    };

    apiFetch("/api/matches", {
        method: "POST",
        body: JSON.stringify(matchData)
    })
    .then(function (data) {
        if (data.success === true) {
            localStorage.setItem("currentMatchId", data.match.id);
            window.location.href = "match-room.html";
        } else {
            alert(data.message);
            postMatchBtn.textContent = "POST MATCH";
            postMatchBtn.disabled = false;
        }
    })
    .catch(function (error) {
        console.log("ERROR:", error);

        alert("Could not post match. Make sure your backend server is running.");

        postMatchBtn.textContent = "POST MATCH";
        postMatchBtn.disabled = false;
    });
});
