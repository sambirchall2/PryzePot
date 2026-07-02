function showToast(message, type) {
    let toast = document.getElementById("pryzepotToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "pryzepotToast";
        toast.className = "pryzepot-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = "pryzepot-toast show " + (type || "success");

    setTimeout(function () {
        toast.className = "pryzepot-toast " + (type || "success");
    }, 2800);
}