const API_BASE_URL = "https://api.pryzepot.com";

const username = localStorage.getItem("username");

if (!username) {
    window.location.href = "index.html";
}

const backButton = document.getElementById("backButton");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const friendsList = document.getElementById("friendsList");

if (backButton) {
    backButton.addEventListener("click", function () {
        window.location.href = "home.html";
    });
}

function openProfile(playerUsername) {
    window.location.href =
        "profile.html?user=" + encodeURIComponent(playerUsername);
}

function searchPlayers() {

    const query = searchInput.value.trim();

    if (query.length < 2) {
        searchResults.innerHTML = "";
        return;
    }

    fetch(API_BASE_URL + "/api/users/search/" + encodeURIComponent(query))
        .then(function(response){
            return response.json();
        })
        .then(function(data){

            searchResults.innerHTML = "";

            if (!data.success || !data.users.length){

                searchResults.innerHTML =
                `
                <div class="empty-card">
                    No players found.
                </div>
                `;

                return;
            }

            data.users.forEach(function(user){

                if(user.username === username){
                    return;
                }

                const card = document.createElement("div");

                card.className = "player-card";

                card.innerHTML = `
                    <img
                        class="player-avatar"
                        src="../assets/profile/${user.profile_picture || "avatar1"}.png"
                    >

                    <div class="player-info">

                        <div class="player-name">
                            ${user.username}
                        </div>

                        <div class="player-level">
                            Level ${user.level || 1}
                        </div>

                    </div>

                    <button class="view-profile-btn">
                        View
                    </button>
                `;

                card.querySelector(".view-profile-btn")
                    .addEventListener("click",function(){

                        openProfile(user.username);

                    });

                searchResults.appendChild(card);

            });

        });

}

function loadFriends(){

    friendsList.innerHTML =
    `
        <div class="loading-card">
            Loading...
        </div>
    `;

    fetch(API_BASE_URL + "/api/friends/" + encodeURIComponent(username))
        .then(function(response){
            return response.json();
        })
        .then(async function(data){

            if(!data.success){

                friendsList.innerHTML =
                `
                <div class="empty-card">
                    Could not load friends.
                </div>
                `;

                return;
            }

            const friends = data.friends || [];

            if(friends.length===0){

                friendsList.innerHTML =
                `
                <div class="empty-card">
                    You don't have any friends yet.
                </div>
                `;

                return;
            }

            friendsList.innerHTML = "";

            for(const friendUsername of friends){

                const response =
                    await fetch(API_BASE_URL + "/api/users/" + encodeURIComponent(friendUsername) + "/profile");

                const result = await response.json();

                if(!result.success){
                    continue;
                }

                const user = result.user;

                const card = document.createElement("div");

                card.className = "friend-card";

                card.innerHTML = `
                    <img
                        class="friend-avatar"
                        src="../assets/profile/${user.profile_picture || "avatar1"}.png"
                    >

                    <div class="friend-info">

                        <div class="friend-name">

                            ${user.username}

                        </div>

                        <div class="friend-status">

                            <span class="online-dot"></span>

                            Online Soon

                        </div>

                    </div>

                    <button class="view-profile-btn">

                        View

                    </button>
                `;

                card.querySelector(".view-profile-btn")
                    .addEventListener("click",function(){

                        openProfile(user.username);

                    });

                friendsList.appendChild(card);

            }

        });

}

searchInput.addEventListener("input",searchPlayers);

loadFriends();