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
