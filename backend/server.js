require("dotenv").config();

const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();

app.use(cors());
app.use(express.json());

const OPEN_MATCH_EXPIRATION_MINUTES = 10;
const ACTIVE_MATCH_EXPIRATION_MINUTES = 30;

function cleanTag(tag) {
    return tag.replace("#", "").toUpperCase();
}

function encodeTag(tag) {
    return encodeURIComponent("#" + cleanTag(tag));
}

function parseClashTime(clashTime) {
    return new Date(
        clashTime.substring(0, 4) + "-" +
        clashTime.substring(4, 6) + "-" +
        clashTime.substring(6, 8) + "T" +
        clashTime.substring(9)
    ).getTime();
}

function dbMatchToFrontend(match) {
    return {
        id: match.id,
        game: match.game,
        mode: match.mode,
        entryFee: match.entry_fee,

        creatorUsername: match.creator_username,
        creatorTag: match.creator_tag,
        creatorFriendLink: match.creator_friend_link,

        opponentUsername: match.opponent_username,
        opponentTag: match.opponent_tag,
        opponentFriendLink: match.opponent_friend_link,

        status: match.status,

        createdAt: match.created_at,
        expiresAt: match.expires_at,
        verifyExpiresAt: match.verify_expires_at,

        winnerUsername: match.winner_username,
        winnerTag: match.winner_tag,
        loserUsername: match.loser_username,
        loserTag: match.loser_tag,

        verifiedAt: match.verified_at
    };
}

async function getBattleLog(playerTag) {
    const response = await fetch(
        "https://api.clashroyale.com/v1/players/" + encodeTag(playerTag) + "/battlelog",
        {
            method: "GET",
            headers: {
                Authorization: "Bearer " + process.env.CLASH_API_KEY
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || data.reason || "Clash battle log error");
    }

    return data;
}

function findMatchingBattle(battles, match) {
    const creatorTag = "#" + cleanTag(match.creator_tag);
    const opponentTag = "#" + cleanTag(match.opponent_tag);

    for (const battle of battles) {
        if (!battle.team || !battle.opponent) continue;
        if (!battle.team[0] || !battle.opponent[0]) continue;

        const teamPlayer = battle.team[0];
        const enemyPlayer = battle.opponent[0];

        const teamTag = teamPlayer.tag;
        const enemyTag = enemyPlayer.tag;

        const isCorrectPlayers =
            (teamTag === creatorTag && enemyTag === opponentTag) ||
            (teamTag === opponentTag && enemyTag === creatorTag);

        if (!isCorrectPlayers) continue;

        const battleTime = parseClashTime(battle.battleTime);

        if (battleTime < match.created_at) continue;

        const teamCrowns = teamPlayer.crowns || 0;
        const enemyCrowns = enemyPlayer.crowns || 0;

        if (teamCrowns === enemyCrowns) {
            return {
                found: true,
                draw: true,
                battle: battle
            };
        }

        const winnerTag = teamCrowns > enemyCrowns ? teamTag : enemyTag;
        const loserTag = teamCrowns > enemyCrowns ? enemyTag : teamTag;

        return {
            found: true,
            draw: false,
            winnerTag: winnerTag,
            loserTag: loserTag,
            battle: battle
        };
    }

    return {
        found: false
    };
}

async function expireOldMatches() {
    const now = Date.now();

    await supabase
        .from("matches")
        .update({ status: "Expired" })
        .eq("status", "Waiting for opponent")
        .lt("expires_at", now);

    await supabase
        .from("matches")
        .update({ status: "Expired" })
        .eq("status", "Match ready")
        .lt("verify_expires_at", now);
}

app.get("/api/test", function (req, res) {
    res.json({
        success: true,
        message: "Hello from PryzePot Backend"
    });
});

app.post("/api/signup", async function (req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
        res.json({
            success: false,
            message: "Please enter username, email, and password."
        });
        return;
    }

    const existingUser = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (existingUser.data) {
        res.json({
            success: false,
            message: "An account with this email already exists."
        });
        return;
    }

    const newUser = await supabase
        .from("users")
        .insert({
            username: username,
            email: email,
            password: password,
            balance: 0
        })
        .select()
        .single();

    if (newUser.error) {
        console.log("SIGNUP ERROR:", newUser.error);

        res.json({
            success: false,
            message: "Could not create account."
        });
        return;
    }

    res.json({
        success: true,
        message: "Account created!",
        user: {
            username: newUser.data.username,
            balance: newUser.data.balance
        }
    });
});

app.post("/api/login", async function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    const foundUser = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .maybeSingle();

    if (foundUser.error) {
        console.log("LOGIN ERROR:", foundUser.error);
    }

    if (foundUser.data) {
        res.json({
            success: true,
            message: "Login successful!",
            user: {
                username: foundUser.data.username,
                balance: foundUser.data.balance
            }
        });
    } else {
        res.json({
            success: false,
            message: "Invalid email or password."
        });
    }
});

app.post("/api/clash/verify-player", async function (req, res) {
    const playerTag = req.body.playerTag;

    if (!playerTag) {
        res.json({
            success: false,
            message: "Please enter a Clash Royale player tag."
        });
        return;
    }

    if (!process.env.CLASH_API_KEY) {
        res.json({
            success: false,
            message: "Server is missing Clash Royale API key."
        });
        return;
    }

    try {
        const clashResponse = await fetch(
            "https://api.clashroyale.com/v1/players/" + encodeTag(playerTag),
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer " + process.env.CLASH_API_KEY
                }
            }
        );

        const clashData = await clashResponse.json();

        if (!clashResponse.ok) {
            res.json({
                success: false,
                message:
                    "Clash API error: " +
                    clashResponse.status +
                    " - " +
                    (clashData.message || clashData.reason || "Unknown error")
            });
            return;
        }

        res.json({
            success: true,
            message: "Clash player verified!",
            player: {
                tag: clashData.tag,
                name: clashData.name,
                trophies: clashData.trophies,
                expLevel: clashData.expLevel
            }
        });

    } catch (error) {
        console.log("CLASH API ERROR:", error);

        res.json({
            success: false,
            message: "Could not connect to Clash Royale API."
        });
    }
});

app.get("/api/matches", async function (req, res) {
    await expireOldMatches();

    const result = await supabase
        .from("matches")
        .select("*")
        .in("status", ["Waiting for opponent", "Match ready"])
        .order("id", { ascending: false });

    if (result.error) {
        console.log("LOAD MATCHES ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not load matches."
        });
        return;
    }

    res.json({
        success: true,
        matches: result.data.map(dbMatchToFrontend)
    });
});

app.post("/api/matches", async function (req, res) {
    await expireOldMatches();

    const username = req.body.username;
    const playerTag = req.body.playerTag;
    const friendLink = req.body.friendLink;
    const entryFee = req.body.entryFee;

    if (!username || !playerTag || !friendLink || !entryFee) {
        res.json({
            success: false,
            message: "Missing match information."
        });
        return;
    }

    const now = Date.now();

    const result = await supabase
        .from("matches")
        .insert({
            game: "Clash Royale",
            mode: "1v1 Friendly Battle",
            entry_fee: entryFee,

            creator_username: username,
            creator_tag: "#" + cleanTag(playerTag),
            creator_friend_link: friendLink,

            opponent_username: null,
            opponent_tag: null,
            opponent_friend_link: null,

            status: "Waiting for opponent",

            created_at: now,
            expires_at: now + OPEN_MATCH_EXPIRATION_MINUTES * 60 * 1000,
            verify_expires_at: null,

            winner_username: null,
            winner_tag: null,
            loser_username: null,
            loser_tag: null,
            verified_at: null
        })
        .select()
        .single();

    if (result.error) {
        console.log("CREATE MATCH ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not create match."
        });
        return;
    }

    res.json({
        success: true,
        message: "Match posted!",
        match: dbMatchToFrontend(result.data)
    });
});

app.post("/api/matches/:id/join", async function (req, res) {
    await expireOldMatches();

    const matchId = Number(req.params.id);
    const username = req.body.username;
    const playerTag = req.body.playerTag;
    const friendLink = req.body.friendLink;

    const found = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

    if (!found.data) {
        res.json({
            success: false,
            message: "Match not found or expired."
        });
        return;
    }

    const foundMatch = found.data;

    if (foundMatch.status !== "Waiting for opponent") {
        res.json({
            success: false,
            message: "This match is no longer open."
        });
        return;
    }

    if (cleanTag(foundMatch.creator_tag) === cleanTag(playerTag)) {
        res.json({
            success: false,
            message: "You cannot join your own match."
        });
        return;
    }

    if (!friendLink) {
        res.json({
            success: false,
            message: "Missing Clash friend link."
        });
        return;
    }

    const update = await supabase
        .from("matches")
        .update({
            opponent_username: username,
            opponent_tag: "#" + cleanTag(playerTag),
            opponent_friend_link: friendLink,
            status: "Match ready",
            verify_expires_at:
                Date.now() + ACTIVE_MATCH_EXPIRATION_MINUTES * 60 * 1000
        })
        .eq("id", matchId)
        .select()
        .single();

    if (update.error) {
        console.log("JOIN MATCH ERROR:", update.error);

        res.json({
            success: false,
            message: "Could not join match."
        });
        return;
    }

    res.json({
        success: true,
        message: "Match joined!",
        match: dbMatchToFrontend(update.data)
    });
});

app.post("/api/matches/:id/verify", async function (req, res) {
    await expireOldMatches();

    const matchId = Number(req.params.id);

    const found = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

    if (!found.data) {
        res.json({
            success: false,
            message: "Match not found or expired."
        });
        return;
    }

    const foundMatch = found.data;

    if (foundMatch.status === "Completed") {
        res.json({
            success: true,
            message: "Match already verified.",
            match: dbMatchToFrontend(foundMatch)
        });
        return;
    }

    if (foundMatch.status !== "Match ready") {
        res.json({
            success: false,
            message: "Match is not ready for verification."
        });
        return;
    }

    if (!process.env.CLASH_API_KEY) {
        res.json({
            success: false,
            message: "Server is missing Clash Royale API key."
        });
        return;
    }

    try {
        const creatorBattles = await getBattleLog(foundMatch.creator_tag);
        const result = findMatchingBattle(creatorBattles, foundMatch);

        if (!result.found) {
            res.json({
                success: false,
                pending: true,
                message: "No matching battle found yet. Try again in a minute."
            });
            return;
        }

        if (result.draw) {
            const drawUpdate = await supabase
                .from("matches")
                .update({
                    status: "Draw",
                    verified_at: Date.now()
                })
                .eq("id", matchId)
                .select()
                .single();

            res.json({
                success: true,
                draw: true,
                message: "Battle found, but it was a draw.",
                match: dbMatchToFrontend(drawUpdate.data)
            });
            return;
        }

        const creatorClean = "#" + cleanTag(foundMatch.creator_tag);
        const opponentClean = "#" + cleanTag(foundMatch.opponent_tag);

        let winnerUsername = null;
        let winnerTag = null;
        let loserUsername = null;
        let loserTag = null;

        if (result.winnerTag === creatorClean) {
            winnerUsername = foundMatch.creator_username;
            winnerTag = foundMatch.creator_tag;
            loserUsername = foundMatch.opponent_username;
            loserTag = foundMatch.opponent_tag;
        } else if (result.winnerTag === opponentClean) {
            winnerUsername = foundMatch.opponent_username;
            winnerTag = foundMatch.opponent_tag;
            loserUsername = foundMatch.creator_username;
            loserTag = foundMatch.creator_tag;
        }

        const completed = await supabase
            .from("matches")
            .update({
                status: "Completed",
                winner_username: winnerUsername,
                winner_tag: winnerTag,
                loser_username: loserUsername,
                loser_tag: loserTag,
                verified_at: Date.now()
            })
            .eq("id", matchId)
            .select()
            .single();

        await supabase
            .from("match_results")
            .insert({
                match_id: matchId,
                winner_username: winnerUsername,
                winner_tag: winnerTag,
                loser_username: loserUsername,
                loser_tag: loserTag
            });

        res.json({
            success: true,
            message: winnerUsername + " won the match!",
            winnerUsername: winnerUsername,
            loserUsername: loserUsername,
            match: dbMatchToFrontend(completed.data)
        });

    } catch (error) {
        console.log("VERIFY ERROR:", error);

        res.json({
            success: false,
            message: "Could not verify match through Clash Royale API."
        });
    }
});

app.post("/api/matches/:id/cancel", async function (req, res) {
    await expireOldMatches();

    const matchId = Number(req.params.id);
    const username = req.body.username;

    const found = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

    if (!found.data) {
        res.json({
            success: false,
            message: "Match not found or expired."
        });
        return;
    }

    const foundMatch = found.data;

    if (foundMatch.creator_username !== username) {
        res.json({
            success: false,
            message: "Only the creator can cancel this match."
        });
        return;
    }

    if (foundMatch.status !== "Waiting for opponent") {
        res.json({
            success: false,
            message: "You cannot cancel after an opponent joins."
        });
        return;
    }

    await supabase
        .from("matches")
        .update({ status: "Cancelled" })
        .eq("id", matchId);

    res.json({
        success: true,
        message: "Match cancelled."
    });
});

app.get("/api/matches/:id", async function (req, res) {
    await expireOldMatches();

    const matchId = Number(req.params.id);

    const found = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

    if (!found.data) {
        res.json({
            success: false,
            message: "Match not found or expired."
        });
        return;
    }

    res.json({
        success: true,
        match: dbMatchToFrontend(found.data)
    });
});
app.post("/api/users/save-clash", async function (req, res) {

    const username = req.body.username;
    const clashTag = req.body.clashTag;
    const clashName = req.body.clashName;
    const clashFriendLink = req.body.clashFriendLink;
    const clashTrophies = req.body.clashTrophies;
    const clashExpLevel = req.body.clashExpLevel;

    const result = await supabase
        .from("users")
        .update({
            clash_tag: clashTag,
            clash_name: clashName,
            clash_friend_link: clashFriendLink,
            clash_trophies: clashTrophies,
            clash_exp_level: clashExpLevel,
            clash_verified: true
        })
        .eq("username", username)
        .select()
        .single();

    if (result.error) {
        console.log("SAVE CLASH ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not save Clash account."
        });

        return;
    }

    res.json({
        success: true,
        message: "Clash account saved."
    });
});

app.get("/api/users/:username/profile", async function (req, res) {

    const username = req.params.username;

    const result = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .maybeSingle();

    if (!result.data) {
        res.json({
            success: false,
            message: "User not found."
        });

        return;
    }

    res.json({
        success: true,
        user: result.data
    });
});
app.listen(3000, function () {
    console.log("Server running on port 3000");

    if (process.env.CLASH_API_KEY) {
        console.log("Clash API key loaded.");
    } else {
        console.log("Clash API key missing.");
    }

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
        console.log("Supabase connected.");
    } else {
        console.log("Supabase env missing.");
    }
});