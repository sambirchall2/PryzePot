const API_BASE_URL = "https://api.pryzepot.com";

function apiFetch(path, options) {
    options = options || {};

    const headers = Object.assign(
        { "Content-Type": "application/json" },
        options.headers || {}
    );

    const token = localStorage.getItem("authToken");

    if (token) {
        headers.Authorization = "Bearer " + token;
    }

    return fetch(API_BASE_URL + path, Object.assign({}, options, { headers: headers }))
        .then(function (response) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = "/html/index.html";
                throw new Error("Not authenticated");
            }

            return response.json();
        });
}

function sendHeartbeat() {
    if (!localStorage.getItem("authToken")) return;

    apiFetch("/api/users/heartbeat", {
        method: "POST",
        body: JSON.stringify({})
    })
    .catch(function (error) {
        console.log("HEARTBEAT ERROR:", error);
    });
}

sendHeartbeat();
setInterval(sendHeartbeat, 30000);

const CLASH_FRIEND_LINK_EXPIRATION_MS = 24 * 60 * 60 * 1000;

function getClashFriendLink() {
    const link = localStorage.getItem("clashFriendLink");
    const setAt = Number(localStorage.getItem("clashFriendLinkSetAt") || 0);

    if (!link) return null;

    if (!setAt || (Date.now() - setAt) > CLASH_FRIEND_LINK_EXPIRATION_MS) {
        localStorage.removeItem("clashFriendLink");
        localStorage.removeItem("clashFriendLinkSetAt");
        return null;
    }

    return link;
}

function apiFetchForm(path, formData) {
    const headers = {};

    const token = localStorage.getItem("authToken");

    if (token) {
        headers.Authorization = "Bearer " + token;
    }

    return fetch(API_BASE_URL + path, {
        method: "POST",
        headers: headers,
        body: formData
    }).then(function (response) {
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = "/html/index.html";
            throw new Error("Not authenticated");
        }

        return response.json();
    });
}
