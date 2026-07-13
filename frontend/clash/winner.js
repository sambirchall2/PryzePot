const resultBadge = document.getElementById("resultBadge");
const resultTitle = document.getElementById("resultTitle");
const resultSubtitle = document.getElementById("resultSubtitle");
const entryAmount = document.getElementById("entryAmount");
const homeBtn = document.getElementById("homeBtn");
const boardBtn = document.getElementById("boardBtn");
const confettiContainer = document.getElementById("confettiContainer");

const matchResult = localStorage.getItem("matchResult");
const entryFee = localStorage.getItem("entryFee") || "0";

entryAmount.innerHTML = '<img class="coin-icon" src="../assets/p-coin-small.png" alt="Vault Credits">' + entryFee;

if (matchResult === "loss") {
    resultBadge.textContent = "Result Submitted";
    resultBadge.classList.add("loss");

    resultTitle.textContent = "MATCH LOST";
    resultTitle.classList.add("loss");

    resultSubtitle.textContent =
        "Result submitted. Better luck next match.";
} else {
    resultBadge.textContent = "Victory";
    resultTitle.textContent = "YOU WON";
    resultSubtitle.textContent =
        "Prize secured. Match result submitted.";

    launchConfetti();
}

function launchConfetti() {
    for (let i = 0; i < 80; i++) {
        const piece = document.createElement("div");

        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.animationDelay = Math.random() * 1.5 + "s";
        piece.style.transform = "rotate(" + Math.random() * 360 + "deg";

        if (i % 3 === 0) {
            piece.style.background = "#ffffff";
        }

        if (i % 3 === 1) {
            piece.style.background = "#b6ff00";
        }

        if (i % 3 === 2) {
            piece.style.background = "#7fcf7a";
        }

        confettiContainer.appendChild(piece);

        setTimeout(function () {
            piece.remove();
        }, 4200);
    }
}

homeBtn.addEventListener("click", function () {
    window.location.href = "../html/home.html";
});

boardBtn.addEventListener("click", function () {
    window.location.href = "match-board.html";
});