const API_BASE_URL = "https://api.pryzepot.com";

function getCosmeticImagePath(value, type) {
    if (!value) return "";

    const cleanValue = String(value);

    if (cleanValue.startsWith("../")) return cleanValue;
    if (cleanValue.startsWith("assets/")) return "../" + cleanValue;
    if (cleanValue.includes("/")) return "../" + cleanValue;

    if (type === "Avatar" && cleanValue.startsWith("avatar")) {
        return "../assets/profile/" + cleanValue + ".png";
    }

    if (type === "Banner" && cleanValue.startsWith("banner")) {
        return "../assets/profile/" + cleanValue + ".png";
    }

    if (type === "Avatar") return "../assets/vault/avatars/" + cleanValue + ".png";
    if (type === "Banner") return "../assets/vault/banners/" + cleanValue + ".png";
    if (type === "Frame") return "../assets/vault/frames/" + cleanValue + ".png";
    if (type === "Badge") return "../assets/vault/badges/" + cleanValue + ".png";

    return "";
}

function normalizePlayerProfile(user) {
    user = user || {};

    return {
        username: user.username || localStorage.getItem("username") || "Player",
        balance: user.balance || localStorage.getItem("balance") || 0,

        avatar: user.equipped_avatar || user.profile_picture || "avatar1",
        banner: user.equipped_banner || user.profile_banner || "banner1",
        frame: user.equipped_frame || null,
        badge: user.equipped_badge || null,
        title: user.equipped_title || null,

        level: user.level || localStorage.getItem("level") || 1,
        xp: user.xp || localStorage.getItem("xp") || 0,

        xpProgress: user.xp_progress || {
            current_xp: user.xp || 0,
            next_level_xp: 100,
            next_level: 2,
            progress_percent: 0
        },

        stats: user.stats || {}
    };
}

function loadPlayerProfile(username) {
    return fetch(API_BASE_URL + "/api/users/" + encodeURIComponent(username) + "/profile")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (!data.success || !data.user) {
                throw new Error(data.message || "Could not load profile.");
            }

            return normalizePlayerProfile(data.user);
        });
}

function renderHomeProfileCard(container, profile) {
    if (!container || !profile) return;

    const xp = profile.xpProgress || {};
    const percent = Math.max(0, Math.min(100, Number(xp.progress_percent || 0)));

    container.innerHTML = `
        <img
            class="pp-home-banner"
            src="${getCosmeticImagePath(profile.banner, "Banner")}"
            alt="Profile Banner"
        >

        <div class="pp-home-overlay"></div>

        <div class="pp-home-inner">

            <div class="pp-avatar-wrap pp-avatar-home">
                <img
                    class="pp-avatar"
                    src="${getCosmeticImagePath(profile.avatar, "Avatar")}"
                    alt="Avatar"
                >

                ${
                    profile.frame
                        ? `<img class="pp-frame" src="${getCosmeticImagePath(profile.frame, "Frame")}" alt="Frame">`
                        : ""
                }
            </div>

            <div class="pp-home-main">

                <div class="pp-home-top">

                    <div class="pp-home-left">
                        <h2>${profile.username}</h2>

                        <div class="pp-home-xp-text">
                            ${xp.current_xp || 0} / ${xp.next_level_xp || 100} XP
                        </div>
                    </div>

                    <div class="pp-home-right">

                        <div class="pp-home-reward-row">
                            ${
                                profile.badge
                                    ? `<img class="pp-badge" src="${getCosmeticImagePath(profile.badge, "Badge")}" alt="Badge">`
                                    : ""
                            }

                            ${
                                profile.title
                                    ? `<div class="pp-title">${profile.title}</div>`
                                    : ""
                            }
                        </div>

                        <div class="pp-home-stats">
                            <span>Level ${profile.level}</span>
                            <span>$ ${Number(profile.balance || 0).toLocaleString()}</span>
                        </div>

                    </div>

                </div>

                <div class="pp-xp-bottom">
                    <div class="pp-xp-bar">
                        <div class="pp-xp-fill" style="width:${percent}%"></div>
                    </div>

                    <div class="pp-next-level">
                        Lvl ${xp.next_level || Number(profile.level || 1) + 1}
                    </div>
                </div>

            </div>

        </div>
    `;
}S