const backBtn = document.getElementById("backBtn");
const subtitle = document.getElementById("subtitle");

const tournamentContext = document.getElementById("tournamentContext");
const tournamentContextValue = document.getElementById("tournamentContextValue");

const scheduleDate = document.getElementById("scheduleDate");
const scheduleHour = document.getElementById("scheduleHour");
const scheduleMinute = document.getElementById("scheduleMinute");
const scheduleMeridiem = document.getElementById("scheduleMeridiem");
const scheduleDateTimeError = document.getElementById("scheduleDateTimeError");
const confirmBtn = document.getElementById("confirmBtn");

const createGame = localStorage.getItem("createGame");
const createType = localStorage.getItem("createType");
const tournamentSize = localStorage.getItem("tournamentSize");
const entryFee = Number(localStorage.getItem("entryFee")) || 0;

const GAME_LABELS = {
    clash: "Clash Royale",
    chess: "Chess.com",
    madden: "Madden NFL"
};

if (!createGame) {
    window.location.href = "games.html";
}

if (createGame && !entryFee) {
    window.location.href = "../" + createGame + "/entry.html";
}

const isTournament = createType === "tournament" && tournamentSize;

if (subtitle) {
    const gameLabel = GAME_LABELS[createGame] || "Your match";
    const modeLabel = isTournament
        ? tournamentSize + "-Player Tournament"
        : "1v1 Online Match";

    subtitle.textContent = gameLabel + " · " + modeLabel;
}

if (isTournament && tournamentContext && tournamentContextValue) {
    tournamentContextValue.textContent = tournamentSize + " Players";
    tournamentContext.classList.remove("hidden");
}

function toDateInputValue(date) {
    const pad = function (n) { return String(n).padStart(2, "0"); };

    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function to24Hour(hour12, meridiem) {
    const hour = hour12 % 12;

    return meridiem === "PM" ? hour + 12 : hour;
}

function getSelectedDateTime() {
    const dateValue = scheduleDate.value;

    if (!dateValue) return null;

    const parts = dateValue.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const hour24 = to24Hour(Number(scheduleHour.value), scheduleMeridiem.value);
    const minute = Number(scheduleMinute.value);

    const chosen = new Date(year, month - 1, day, hour24, minute, 0, 0);

    return isNaN(chosen.getTime()) ? null : chosen;
}

function isDateTimeValid() {
    const chosen = getSelectedDateTime();

    return !!chosen && chosen.getTime() > Date.now();
}

function refreshDateTimeUI() {
    const isPast = !isDateTimeValid();

    if (scheduleDateTimeError) {
        scheduleDateTimeError.textContent = isPast ? "Pick a date and time in the future." : "";
        scheduleDateTimeError.classList.toggle("hidden", !isPast);
    }

    confirmBtn.disabled = !isDateTimeValid();
}

// Rounds up to the next 15-minute mark. Epoch-ms rounding stays aligned
// with local wall-clock quarter-hours because every real-world UTC
// offset is itself a multiple of 15 minutes.
function getDefaultDateTime() {
    const quarterHourMs = 15 * 60 * 1000;

    return new Date(Math.ceil(Date.now() / quarterHourMs) * quarterHourMs);
}

function applyDefaultDateTime() {
    const today = new Date();
    const rounded = getDefaultDateTime();

    scheduleDate.min = toDateInputValue(today);
    scheduleDate.value = toDateInputValue(rounded);

    const hour24 = rounded.getHours();
    const meridiem = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

    scheduleHour.value = String(hour12);
    scheduleMinute.value = String(rounded.getMinutes()).padStart(2, "0");
    scheduleMeridiem.value = meridiem;
}

if (scheduleDate && scheduleHour && scheduleMinute && scheduleMeridiem) {
    applyDefaultDateTime();
}

if (backBtn) {
    backBtn.addEventListener("click", function () {
        window.location.href = "play-mode.html";
    });
}

[scheduleDate, scheduleHour, scheduleMinute, scheduleMeridiem].forEach(function (field) {
    if (field) {
        field.addEventListener("change", refreshDateTimeUI);
    }
});

if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
        if (confirmBtn.disabled) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = "SCHEDULING...";

        const scheduledTimeMs = getSelectedDateTime().getTime();

        if (isTournament) {
            const tournamentPayload = {
                tournamentSize: Number(tournamentSize),
                entryFee: entryFee,
                tournamentType: "scheduled",
                scheduledTime: scheduledTimeMs
            };

            if (createGame === "chess") {
                tournamentPayload.game = "Chess.com";
                tournamentPayload.playerTag = getChessUsername();
            } else {
                tournamentPayload.playerTag = localStorage.getItem("clashPlayerTag");
                tournamentPayload.friendLink = getClashFriendLink();
            }

            apiFetch("/api/tournaments", {
                method: "POST",
                body: JSON.stringify(tournamentPayload)
            })
                .then(function (data) {
                    if (!data.success) {
                        showToast(data.message || "Could not schedule this tournament.", "error");

                        confirmBtn.disabled = false;
                        confirmBtn.textContent = "CONFIRM SCHEDULE";
                        return;
                    }

                    showToast("Tournament scheduled!", "success");

                    window.location.href = "match-detail.html?matchId=" + data.tournament.id + "&type=tournament";
                })
                .catch(function (error) {
                    console.log("SCHEDULE TOURNAMENT ERROR:", error);

                    showToast("Could not schedule this tournament. Make sure your backend server is running.", "error");

                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "CONFIRM SCHEDULE";
                });
            return;
        }

        const payload = {
            entryFee: entryFee,
            matchType: "scheduled",
            scheduledTime: scheduledTimeMs
        };

        if (createGame === "chess") {
            payload.game = "Chess.com";
            payload.playerTag = getChessUsername();
        } else if (createGame === "madden") {
            payload.game = "Madden NFL";
            payload.playerTag = localStorage.getItem("maddenEaName");
            payload.edition = localStorage.getItem("maddenEdition");
            payload.platform = localStorage.getItem("maddenPlatform");
            payload.skillDifficulty = localStorage.getItem("maddenSkillDifficulty");
        } else {
            payload.playerTag = localStorage.getItem("clashPlayerTag");
            payload.friendLink = getClashFriendLink();
        }

        apiFetch("/api/matches", {
            method: "POST",
            body: JSON.stringify(payload)
        })
            .then(function (data) {
                if (!data.success) {
                    showToast(data.message || "Could not schedule this match.", "error");

                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "CONFIRM SCHEDULE";
                    return;
                }

                showToast("Match scheduled!", "success");

                window.location.href = "match-detail.html?matchId=" + data.match.id + "&type=match";
            })
            .catch(function (error) {
                console.log("SCHEDULE MATCH ERROR:", error);

                showToast("Could not schedule this match. Make sure your backend server is running.", "error");

                confirmBtn.disabled = false;
                confirmBtn.textContent = "CONFIRM SCHEDULE";
            });
    });
}

refreshDateTimeUI();
