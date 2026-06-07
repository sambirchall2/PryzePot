const backBtn =
    document.getElementById("backBtn");

const agreeCheckbox =
    document.getElementById("agreeCheckbox");

const continueBtn =
    document.getElementById("continueBtn");

if (backBtn) {
    backBtn.addEventListener(
        "click",
        function () {
            window.location.href =
                "entry.html";
        }
    );
}

agreeCheckbox.addEventListener(
    "change",
    function () {

        continueBtn.disabled =
            !agreeCheckbox.checked;

    }
);

continueBtn.addEventListener(
    "click",
    function () {

        localStorage.setItem(
            "rulesAccepted",
            "true"
        );

        window.location.href =
            "post-match.html";

    }
);