function getCosmeticImagePath(value, type) {
    if (!value) return "";

    if (value.startsWith("../")) return value;
    if (value.startsWith("assets/")) return "../" + value;

    if (value.includes("/")) return "../" + value;

    if (type === "Avatar" && value.startsWith("avatar")) {
        return "../assets/profile/" + value + ".png";
    }

    if (type === "Banner" && value.startsWith("banner")) {
        return "../assets/profile/" + value + ".png";
    }

    if (type === "Avatar") return "../assets/vault/avatars/" + value + ".png";
    if (type === "Banner") return "../assets/vault/banners/" + value + ".png";
    if (type === "Frame") return "../assets/vault/frames/" + value + ".png";
    if (type === "Badge") return "../assets/vault/badges/" + value + ".png";

    return "";
}

function setImageIfExists(element, value, type, fallback) {
    if (!element) return;

    const imagePath = getCosmeticImagePath(value || fallback, type);

    if (imagePath) {
        element.src = imagePath;
        element.classList.remove("hidden");
    } else {
        element.classList.add("hidden");
    }
}

function buildAvatarWithFrame(options) {
    const avatar = options.avatar || "avatar1";
    const frame = options.frame || null;

    return `
        <div class="pp-avatar-wrap">
            <img class="pp-avatar" src="${getCosmeticImagePath(avatar, "Avatar")}" alt="Avatar">
            ${frame ? `<img class="pp-frame" src="${getCosmeticImagePath(frame, "Frame")}" alt="Frame">` : ""}
        </div>
    `;
}

function buildBadge(options) {
    if (!options.badge) return "";

    return `
        <img class="pp-badge" src="${getCosmeticImagePath(options.badge, "Badge")}" alt="Badge">
    `;
}

function buildTitle(options) {
    if (!options.title) return "";

    return `
        <div class="pp-title">${options.title}</div>
    `;
}