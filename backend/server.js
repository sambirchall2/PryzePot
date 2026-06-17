require("dotenv").config();

const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();

app.use(cors({
  origin: [
    "https://pryze-pot.vercel.app",
    "https://pryzepot.com",
    "https://www.pryzepot.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
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

function normalizeTimeToMs(timeValue) {
    if (!timeValue) return 0;

    if (typeof timeValue === "number") {
        return timeValue;
    }

    if (typeof timeValue === "string") {
        if (timeValue.includes("T") && timeValue.includes(".")) {
            return new Date(timeValue).getTime();
        }

        return parseClashTime(timeValue);
    }

    return 0;
}

function findMatchingBattle(battles, match) {
    const creatorTag = "#" + cleanTag(match.creator_tag);
    const opponentTag = "#" + cleanTag(match.opponent_tag);

    const cutoffTime = normalizeTimeToMs(
        match.verification_started_at || match.created_at
    );

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

        const battleTimeMs = parseClashTime(battle.battleTime);

        if (battleTimeMs < cutoffTime) continue;

        const battleId = [
            battle.battleTime,
            cleanTag(teamTag),
            cleanTag(enemyTag)
        ].sort().join("-");

        const teamCrowns = teamPlayer.crowns || 0;
        const enemyCrowns = enemyPlayer.crowns || 0;

        if (teamCrowns === enemyCrowns) {
            return {
                found: true,
                draw: true,
                battle: battle,
                battleId: battleId,
                battleTime: battle.battleTime
            };
        }

        const winnerTag = teamCrowns > enemyCrowns ? teamTag : enemyTag;
        const loserTag = teamCrowns > enemyCrowns ? enemyTag : teamTag;

        return {
            found: true,
            draw: false,
            winnerTag: winnerTag,
            loserTag: loserTag,
            battle: battle,
            battleId: battleId,
            battleTime: battle.battleTime
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
function shufflePlayers(players) {
    return players.sort(function () {
        return Math.random() - 0.5;
    });
}

async function createTournamentBracket(tournamentId) {
    const existingMatches = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId);

    if (existingMatches.data && existingMatches.data.length > 0) {
        return;
    }

    const playersResult = await supabase
        .from("tournament_players")
        .select("*")
        .eq("tournament_id", tournamentId);

    if (playersResult.error || !playersResult.data) {
        console.log("LOAD TOURNAMENT PLAYERS ERROR:", playersResult.error);
        return;
    }

    const players = shufflePlayers(playersResult.data);

    const bracketMatches = [];

    for (let i = 0; i < players.length; i += 2) {
        if (!players[i] || !players[i + 1]) continue;

        bracketMatches.push({
    tournament_id: tournamentId,
    round_number: 1,

    player_one: players[i].username,
    player_one_tag: players[i].player_tag,
    player_one_friend_link: players[i].friend_link,

    player_two: players[i + 1].username,
    player_two_tag: players[i + 1].player_tag,
    player_two_friend_link: players[i + 1].friend_link,

    winner_username: null,
    winner_tag: null,
    loser_username: null,
    loser_tag: null,

    verified_at: null,
    clash_battle_id: null,

    status: "Ready"
});
    }

    if (bracketMatches.length === 0) {
        return;
    }

    const insertResult = await supabase
        .from("tournament_matches")
        .insert(bracketMatches);

    if (insertResult.error) {
        console.log("CREATE TOURNAMENT BRACKET ERROR:", insertResult.error);
    }
}

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
app.post("/api/tournaments/:id/cancel", async function (req, res) {
    const tournamentId = Number(req.params.id);
    const username = req.body.username;

    const tournamentResult = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

    if (tournamentResult.error || !tournamentResult.data) {
        res.json({
            success: false,
            message: "Tournament not found."
        });
        return;
    }

    const tournament = tournamentResult.data;

    if (tournament.creator_username !== username) {
        res.json({
            success: false,
            message: "Only the tournament creator can cancel this tournament."
        });
        return;
    }

    if (tournament.status !== "Open") {
        res.json({
            success: false,
            message: "This tournament can no longer be cancelled."
        });
        return;
    }

    const updateResult = await supabase
        .from("tournaments")
        .update({
            status: "Cancelled"
        })
        .eq("id", tournamentId);

    if (updateResult.error) {
        res.json({
            success: false,
            message: "Could not cancel tournament."
        });
        return;
    }

    res.json({
        success: true,
        message: "Tournament cancelled."
    });
});


app.post("/api/tournaments", async function (req, res) {
    
    const username = req.body.username;
    const playerTag = req.body.playerTag;
    const friendLink = req.body.friendLink;
    const tournamentSize = req.body.tournamentSize;
    const entryFee = req.body.entryFee;

    if (!username || !playerTag || !tournamentSize || !entryFee) {
        res.json({
            success: false,
            message: "Missing tournament information."
        });
        return;
    }

    if (![4, 8, 16].includes(Number(tournamentSize))) {
        res.json({
            success: false,
            message: "Invalid tournament size."
        });
        return;
    }

    const tournamentResult = await supabase
        .from("tournaments")
        .insert({
            creator_username: username,
            game: "Clash Royale",
            tournament_size: Number(tournamentSize),
            entry_fee: Number(entryFee),
            current_players: 1,
            max_players: Number(tournamentSize),
            status: "Open",
            winner_username: null
        })
        .select()
        .single();

    if (tournamentResult.error) {
        console.log("CREATE TOURNAMENT ERROR:", tournamentResult.error);

        res.json({
            success: false,
            message: "Could not create tournament."
        });
        return;
    }

    const playerResult = await supabase
    .from("tournament_players")
    .insert({
        tournament_id: tournamentResult.data.id,
        username: username,
        player_tag: "#" + cleanTag(playerTag),
        friend_link: friendLink
    });

    if (playerResult.error) {
        console.log("ADD TOURNAMENT PLAYER ERROR:", playerResult.error);

        res.json({
            success: false,
            message: "Tournament created, but player could not be added."
        });
        return;
    }

    res.json({
        success: true,
        message: "Tournament created!",
        tournament: tournamentResult.data
    });
});
app.get("/api/tournaments", async function (req, res) {
    const result = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "Open")
        .order("id", { ascending: false });

    if (result.error) {
        res.json({
            success: false,
            message: "Could not load tournaments."
        });
        return;
    }

    res.json({
        success: true,
        tournaments: result.data
    });
});
app.get("/api/tournaments/:id", async function (req, res) {
    const tournamentId = req.params.id;

    const tournamentResult = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

    if (tournamentResult.error) {
        res.json({
            success: false,
            message: "Tournament not found."
        });
        return;
    }

    const playersResult = await supabase
        .from("tournament_players")
        .select("*")
        .eq("tournament_id", tournamentId);

    const matchesResult = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("id", { ascending: true });

res.json({
    success: true,
    tournament: tournamentResult.data,
    players: playersResult.data || [],
    matches: matchesResult.data || []
});
});
app.post("/api/tournaments/:id/join", async function (req, res) {
    const tournamentId = Number(req.params.id);
    const username = req.body.username;
    const playerTag = req.body.playerTag;
    const friendLink = req.body.friendLink;

    if (!username || !playerTag) {
        res.json({
            success: false,
            message: "Missing tournament join information."
        });
        return;
    }

    const tournamentResult = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .single();

    if (tournamentResult.error || !tournamentResult.data) {
        res.json({
            success: false,
            message: "Tournament not found."
        });
        return;
    }

    const tournament = tournamentResult.data;

    if (tournament.status !== "Open") {
        res.json({
            success: false,
            message: "This tournament is no longer open."
        });
        return;
    }

    if (Number(tournament.current_players) >= Number(tournament.max_players)) {
        res.json({
            success: false,
            message: "This tournament is already full."
        });
        return;
    }

    const alreadyJoined = await supabase
        .from("tournament_players")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("username", username)
        .maybeSingle();

    if (alreadyJoined.data) {
        res.json({
            success: true,
            message: "You are already in this tournament.",
            tournament: tournament
        });
        return;
    }

    const playerResult = await supabase
        .from("tournament_players")
        .insert({
            tournament_id: tournamentId,
            username: username,
            player_tag: "#" + cleanTag(playerTag),
            friend_link: friendLink
        });

    if (playerResult.error) {
        console.log("JOIN TOURNAMENT PLAYER ERROR:", playerResult.error);

        res.json({
            success: false,
            message: "Could not join tournament."
        });
        return;
    }

    const newPlayerCount = Number(tournament.current_players) + 1;
    const newStatus =
        newPlayerCount >= Number(tournament.max_players)
            ? "Full"
            : "Open";

    const updateResult = await supabase
        .from("tournaments")
        .update({
            current_players: newPlayerCount,
            status: newStatus
        })
        .eq("id", tournamentId)
        .select()
        .single();

    if (updateResult.error) {
        console.log("UPDATE TOURNAMENT COUNT ERROR:", updateResult.error);

        res.json({
            success: false,
            message: "Joined tournament, but player count could not update."
        });
        return;
    }
    if (newStatus === "Full") {
    await createTournamentBracket(tournamentId);
}
    res.json({
        success: true,
        message: "Tournament joined!",
        tournament: updateResult.data
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
    const verificationStartedAt = Date.now();
    const update = await supabase
        .from("matches")
        .update({
            opponent_username: username,
            opponent_tag: "#" + cleanTag(playerTag),
            opponent_friend_link: friendLink,
            status: "Match ready",
            verification_started_at: verificationStartedAt,
            verify_expires_at:
                verificationStartedAt +
    ACTIVE_MATCH_EXPIRATION_MINUTES * 60 * 1000
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
app.post("/api/tournament-matches/:id/verify", async function (req, res) {
    const tournamentMatchId = Number(req.params.id);

    const found = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("id", tournamentMatchId)
        .maybeSingle();

    if (!found.data) {
        res.json({
            success: false,
            message: "Tournament match not found."
        });
        return;
    }

    const foundMatch = found.data;

    if (foundMatch.status === "Completed") {
        res.json({
            success: true,
            message: "Tournament match already verified.",
            match: foundMatch
        });
        return;
    }

    if (foundMatch.status !== "Ready") {
        res.json({
            success: false,
            message: "Tournament match is not ready for verification."
        });
        return;
    }

    if (!foundMatch.player_one_tag || !foundMatch.player_two_tag) {
        res.json({
            success: false,
            message: "Tournament match is missing Clash tags."
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
        const fakeMatchForBattleCheck = {
            creator_tag: foundMatch.player_one_tag,
            opponent_tag: foundMatch.player_two_tag,
            created_at: foundMatch.created_at,
            verification_started_at: foundMatch.created_at
        };

        const playerOneBattles = await getBattleLog(foundMatch.player_one_tag);
        const result = findMatchingBattle(playerOneBattles, fakeMatchForBattleCheck);

        if (result.found && result.battleId) {
            const usedInNormalMatch = await supabase
                .from("match_results")
                .select("*")
                .eq("clash_battle_id", result.battleId)
                .maybeSingle();

            if (usedInNormalMatch.data) {
                res.json({
                    success: false,
                    pending: true,
                    message: "This Clash battle was already used. Play a new match before verifying."
                });
                return;
            }

            const usedInTournamentMatch = await supabase
                .from("tournament_matches")
                .select("*")
                .eq("clash_battle_id", result.battleId)
                .maybeSingle();

            if (usedInTournamentMatch.data) {
                res.json({
                    success: false,
                    pending: true,
                    message: "This Clash battle was already used in a tournament."
                });
                return;
            }
        }

        if (!result.found) {
            res.json({
                success: false,
                pending: true,
                message: "No matching Clash battle found yet. Try again in a minute."
            });
            return;
        }

        if (result.draw) {
            res.json({
                success: false,
                pending: true,
                message: "Battle found, but it was a draw. Play again."
            });
            return;
        }

        const playerOneClean = "#" + cleanTag(foundMatch.player_one_tag);
        const playerTwoClean = "#" + cleanTag(foundMatch.player_two_tag);

        let winnerUsername = null;
        let winnerTag = null;
        let loserUsername = null;
        let loserTag = null;

        if (result.winnerTag === playerOneClean) {
            winnerUsername = foundMatch.player_one;
            winnerTag = foundMatch.player_one_tag;
            loserUsername = foundMatch.player_two;
            loserTag = foundMatch.player_two_tag;
        } else if (result.winnerTag === playerTwoClean) {
            winnerUsername = foundMatch.player_two;
            winnerTag = foundMatch.player_two_tag;
            loserUsername = foundMatch.player_one;
            loserTag = foundMatch.player_one_tag;
        }

        if (!winnerUsername) {
            res.json({
                success: false,
                message: "Could not determine tournament winner."
            });
            return;
        }

        const completed = await supabase
            .from("tournament_matches")
            .update({
                status: "Completed",
                winner_username: winnerUsername,
                winner_tag: winnerTag,
                loser_username: loserUsername,
                loser_tag: loserTag,
                verified_at: Date.now(),
                clash_battle_id: result.battleId
            })
            .eq("id", tournamentMatchId)
            .select()
            .single();

        const roundMatchesResult = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", foundMatch.tournament_id)
    .eq("round_number", foundMatch.round_number)
    .order("id", { ascending: true });

const roundMatches = roundMatchesResult.data || [];

const allRoundCompleted =
    roundMatches.length > 0 &&
    roundMatches.every(function (match) {
        return match.status === "Completed";
    });

if (!allRoundCompleted) {
    res.json({
        success: true,
        message: winnerUsername + " won. Waiting for other tournament match.",
        match: completed.data
    });
    return;
}

const winners = roundMatches
    .map(function (match) {
        return {
            username: match.winner_username,
            tag: match.winner_tag,
            friendLink: match.winner_username === match.player_one
                ? match.player_one_friend_link
                : match.player_two_friend_link
        };
    })
    .filter(function (winner) {
        return winner.username && winner.tag;
    });

if (winners.length === 1) {
    await supabase
        .from("tournaments")
        .update({
            winner_username: winners[0].username,
            status: "Completed"
        })
        .eq("id", foundMatch.tournament_id);

    res.json({
        success: true,
        champion: true,
        message: winners[0].username + " is the tournament champion!",
        winnerUsername: winners[0].username,
        winnerTag: winners[0].tag,
        loserUsername: loserUsername,
        loserTag: loserTag,
        match: completed.data
    });
    return;
}

const nextRoundNumber = Number(foundMatch.round_number) + 1;

const existingNextRound = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", foundMatch.tournament_id)
    .eq("round_number", nextRoundNumber);

if (existingNextRound.data && existingNextRound.data.length > 0) {
    res.json({
        success: true,
        message: winnerUsername + " won. Next round is already ready.",
        match: completed.data
    });
    return;
}

const nextRoundMatches = [];

for (let i = 0; i < winners.length; i += 2) {
    if (!winners[i] || !winners[i + 1]) continue;

    nextRoundMatches.push({
        tournament_id: foundMatch.tournament_id,
        round_number: nextRoundNumber,

        player_one: winners[i].username,
        player_one_tag: winners[i].tag,
        player_one_friend_link: winners[i].friendLink,

        player_two: winners[i + 1].username,
        player_two_tag: winners[i + 1].tag,
        player_two_friend_link: winners[i + 1].friendLink,

        winner_username: null,
        winner_tag: null,
        loser_username: null,
        loser_tag: null,

        verified_at: null,
        clash_battle_id: null,

        status: "Ready"
    });
}

if (nextRoundMatches.length > 0) {
    await supabase
        .from("tournament_matches")
        .insert(nextRoundMatches);
}

const nextRoundLabel =
    winners.length === 2
        ? "Final is ready."
        : "Next round is ready.";

res.json({
    success: true,
    message: winnerUsername + " won. " + nextRoundLabel,
    match: completed.data
});
return;

    } catch (error) {
        console.log("TOURNAMENT VERIFY ERROR:", error);

        res.json({
            success: false,
            message: "Could not verify tournament match through Clash Royale API."
        });
    }
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
        if (result.found && result.battleId) {
    const usedBattle = await supabase
        .from("match_results")
        .select("*")
        .eq("clash_battle_id", result.battleId)
        .maybeSingle();

    if (usedBattle.data) {
        res.json({
            success: false,
            pending: true,
            message: "This Clash battle was already used. Play a new match before verifying."
        });
        return;
    }
}

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
                clash_battle_id: result.battleId,
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
app.post("/api/users/save-profile", async function (req, res) {
    const username = req.body.username;
    const profilePicture = req.body.profilePicture;
    const profileBanner = req.body.profileBanner;
    const profileCompleted = req.body.profileCompleted;

    if (!username) {
        res.json({
            success: false,
            message: "Missing username."
        });
        return;
    }

    const result = await supabase
        .from("users")
        .update({
            profile_picture: profilePicture || "avatar1",
            profile_banner: profileBanner || "banner1",
            profile_completed: profileCompleted === true
        })
        .eq("username", username)
        .select()
        .single();

    if (result.error) {
        console.log("SAVE PROFILE ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not save profile."
        });

        return;
    }

    res.json({
        success: true,
        message: "Profile saved.",
        user: result.data
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
const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
    console.log("Server running on port " + PORT);

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