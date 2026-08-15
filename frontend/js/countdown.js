function getCountdownText(targetIso) {
    const targetMs = new Date(targetIso).getTime();

    if (isNaN(targetMs)) return "";

    const diffMs = targetMs - Date.now();

    if (diffMs <= 0) return "Starting now";

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];

    if (days > 0) parts.push(days + "d");
    if (days > 0 || hours > 0) parts.push(hours + "h");
    parts.push(minutes + "m");

    return "Starts in " + parts.join(" ");
}

// Renders a live countdown into `element` and keeps it updated. Returns
// a function that stops the timer (call it if the element is removed
// from the page before navigation/unload would do it automatically).
function startCountdown(element, targetIso, options) {
    if (!element) return function () {};

    const intervalMs = (options && options.intervalMs) || 30000;

    function tick() {
        element.textContent = getCountdownText(targetIso);
    }

    tick();

    const timerId = setInterval(tick, intervalMs);

    return function stopCountdown() {
        clearInterval(timerId);
    };
}
