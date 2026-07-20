require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const multer = require("multer");
const supabase = require("./supabase");

const evidenceUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024,
        files: 3
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image or video files are allowed."));
        }
    }
});

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

const JWT_EXPIRES_IN = "30d";

function signToken(username) {
    return jwt.sign({ username: username }, process.env.JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

function signOAuthState(provider) {
    return jwt.sign({ provider: provider, purpose: "oauth_state" }, process.env.JWT_SECRET, {
        expiresIn: "10m"
    });
}

function verifyOAuthState(state, expectedProvider) {
    const payload = jwt.verify(state, process.env.JWT_SECRET);

    if (payload.purpose !== "oauth_state" || payload.provider !== expectedProvider) {
        throw new Error("Invalid OAuth state.");
    }

    return payload;
}

function signPendingSignup(identity) {
    return jwt.sign({
        provider: identity.provider,
        oauthId: identity.oauthId,
        email: identity.email || "",
        purpose: "oauth_pending_signup"
    }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

function verifyPendingSignup(token) {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.purpose !== "oauth_pending_signup") {
        throw new Error("Invalid pending signup token.");
    }

    return payload;
}

async function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        res.status(401).json({
            success: false,
            message: "Not authenticated."
        });
        return;
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const activeCheck = await supabase
            .from("users")
            .select("is_active")
            .eq("username", payload.username)
            .maybeSingle();

        if (activeCheck.data && activeCheck.data.is_active === false) {
            res.status(401).json({
                success: false,
                message: "This account has been deactivated."
            });
            return;
        }

        req.username = payload.username;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Session expired or invalid. Please log in again."
        });
    }
}

const ADMIN_SESSION_EXPIRES_IN = "2h";

function signAdminSession(username) {
    return jwt.sign({ username: username, purpose: "admin_session" }, process.env.JWT_SECRET, {
        expiresIn: ADMIN_SESSION_EXPIRES_IN
    });
}

async function requireAdminSession(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        res.status(401).json({
            success: false,
            message: "Admin sign-in required."
        });
        return;
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Admin session expired. Please sign in again."
        });
        return;
    }

    if (payload.purpose !== "admin_session") {
        res.status(401).json({
            success: false,
            message: "Admin sign-in required."
        });
        return;
    }

    const userResult = await supabase
        .from("users")
        .select("is_admin")
        .eq("username", payload.username)
        .maybeSingle();

    if (!userResult.data || !userResult.data.is_admin) {
        res.status(403).json({
            success: false,
            message: "Admin access required."
        });
        return;
    }

    req.username = payload.username;
    next();
}

const OPEN_MATCH_EXPIRATION_MINUTES = 10;
const ACTIVE_MATCH_EXPIRATION_MINUTES = 30;

const SEASON_ZERO_SIZE = 128;
const SEASON_ZERO_DEADLINE = new Date("2026-09-05T20:00:00-04:00");

const DAILY_REWARD_SCHEDULE = [25, 50, 75, 100, 125, 150, 175];

function cleanTag(tag) {
    return tag.replace("#", "").toUpperCase();
}

function encodeTag(tag) {
    return encodeURIComponent("#" + cleanTag(tag));
}

function parseClashTime(clashTime) {
    return Date.UTC(
        Number(clashTime.substring(0, 4)),
        Number(clashTime.substring(4, 6)) - 1,
        Number(clashTime.substring(6, 8)),
        Number(clashTime.substring(9, 11)),
        Number(clashTime.substring(11, 13)),
        Number(clashTime.substring(13, 15))
    );
}
function getMatchXpForResult(resultType) {
    if (resultType === "win") return 30;
    if (resultType === "loss") return 10;
    if (resultType === "draw") return 15;

    return 0;
}
const VAULT_TIERS = [
    {
        key: "recruit",
        name: "Bronze Vault",
        price: 5000,
        image: "assets/vault/vaults/recruit-vault.png",
        items: [
            { id: "fireborn", type: "Avatar", name: "Fireborn", image: "assets/vault/avatars/fireborn.png" },
            { id: "frostbite", type: "Avatar", name: "Frostbite", image: "assets/vault/avatars/frostbite.png" },
            { id: "storm-face", type: "Avatar", name: "Storm Face", image: "assets/vault/avatars/storm-face.png" },

            { id: "inferno", type: "Banner", name: "Inferno", image: "assets/vault/banners/inferno.png" },
            { id: "ice-wall", type: "Banner", name: "Ice Wall", image: "assets/vault/banners/ice-wall.png" },
            { id: "dark-matter", type: "Banner", name: "Dark Matter", image: "assets/vault/banners/dark-matter.png" },

            { id: "bronze-edge-frame", type: "Frame", name: "Bronze Edge", image: "assets/vault/frames/bronze-edge-frame.png" },
            { id: "rising-player-badge", type: "Badge", name: "Rising Player", image: "assets/vault/badges/rising-player-badge.png" },
            { id: "the-grinder", type: "Title", name: "The Grinder", image: null }
        ]
    },

    {
        key: "contender",
        name: "Silver Vault",
        price: 15000,
        image: "assets/vault/vaults/contender-vault.png",
        items: [
            { id: "crown-core", type: "Avatar", name: "Crown Core", image: "assets/vault/avatars/crown-core.png" },
            { id: "dragon-pulse", type: "Avatar", name: "Dragon Pulse", image: "assets/vault/avatars/dragon-pulse.png" },
            { id: "skull-shade", type: "Avatar", name: "Skull Shade", image: "assets/vault/avatars/skull-shade.png" },

            { id: "lightning-run", type: "Banner", name: "Lightning Run", image: "assets/vault/banners/lightning-run.png" },
            { id: "neon-galaxy", type: "Banner", name: "Neon Galaxy", image: "assets/vault/banners/neon-galaxy.png" },
            { id: "lime-smoke", type: "Banner", name: "Lime Smoke", image: "assets/vault/banners/lime-smoke.png" },

            { id: "silver-edge-frame", type: "Frame", name: "Silver Edge", image: "assets/vault/frames/silver-edge-frame.png" },
            { id: "veteran-badge", type: "Badge", name: "Veteran", image: "assets/vault/badges/veteran-badge.png" },
            { id: "shield-mark-badge", type: "Badge", name: "Shield Mark", image: "assets/vault/badges/shield-mark-badge.png" },
            { id: "king-slayer", type: "Title", name: "King Slayer", image: null }
        ]
    },

    {
        key: "elite",
        name: "Gold Vault",
        price: 35000,
        image: "assets/vault/vaults/elite-vault.png",
        items: [
            { id: "neon-wizard", type: "Avatar", name: "Neon Wizard", image: "assets/vault/avatars/neon-wizard.png" },
            { id: "cyber-knight", type: "Avatar", name: "Cyber Knight", image: "assets/vault/avatars/cyber-knight.png" },
            { id: "dark-mask", type: "Avatar", name: "Dark Mask", image: "assets/vault/avatars/dark-mask.png" },

            { id: "green-fire", type: "Banner", name: "Green Fire", image: "assets/vault/banners/green-fire.png" },
            { id: "battlefield", type: "Banner", name: "Battlefield", image: "assets/vault/banners/battlefield.png" },
            { id: "crystal-core", type: "Banner", name: "Crystal Core", image: "assets/vault/banners/crystal-core.png" },

            { id: "gold-edge-frame", type: "Frame", name: "Gold Edge", image: "assets/vault/frames/gold-edge-frame.png" },
            { id: "winner-badge", type: "Badge", name: "Winner", image: "assets/vault/badges/winner-badge.png" },
            { id: "elite-competitor", type: "Title", name: "Elite Competitor", image: null }
        ]
    },

    {
        key: "champion",
        name: "Platinum Vault",
        price: 75000,
        image: "assets/vault/vaults/champion-vault.png",
        items: [
            { id: "inferno-dragon", type: "Avatar", name: "Inferno Dragon", image: "assets/vault/avatars/inferno-dragon.png" },
            { id: "royal-ghost", type: "Avatar", name: "Royal Ghost", image: "assets/vault/avatars/royal-ghost.png" },
            { id: "void-reaper", type: "Avatar", name: "Void Reaper", image: "assets/vault/avatars/void-reaper.png" },

            { id: "inferno-banner", type: "Banner", name: "Inferno Banner", image: "assets/vault/banners/inferno-banner.png" },
            { id: "thunder-vault", type: "Banner", name: "Thunder Vault", image: "assets/vault/banners/thunder-vault.png" },
            { id: "toxic-neon", type: "Banner", name: "Toxic Neon", image: "assets/vault/banners/toxic-neon.png" },

            { id: "diamond-edge-frame", type: "Frame", name: "Diamond Edge", image: "assets/vault/frames/diamond-edge-frame.png" },
            { id: "champion-badge", type: "Badge", name: "Champion Badge", image: "assets/vault/badges/champion-badge.png" },
            { id: "champion-title", type: "Title", name: "Champion", image: null }
        ]
    },

    {
        key: "master",
        name: "Diamond Vault",
        price: 150000,
        image: "assets/vault/vaults/master-vault.png",
        items: [
            { id: "neon-wolf", type: "Avatar", name: "Neon Wolf", image: "assets/vault/avatars/neon-wolf.png" },
            { id: "vault-guardian", type: "Avatar", name: "Vault Guardian", image: "assets/vault/avatars/vault-guardian.png" },
            { id: "crown-phantom", type: "Avatar", name: "Crown Phantom", image: "assets/vault/avatars/crown-phantom.png" },

            { id: "master-galaxy", type: "Banner", name: "Master Galaxy", image: "assets/vault/banners/master-galaxy.png" },
            { id: "crown-flame", type: "Banner", name: "Crown Flame", image: "assets/vault/banners/crown-flame.png" },
            { id: "overcharge", type: "Banner", name: "Overcharge", image: "assets/vault/banners/overcharge.png" },

            { id: "master-frame", type: "Frame", name: "Master Frame", image: "assets/vault/frames/master-frame.png" },
            { id: "master-badge", type: "Badge", name: "Master Badge", image: "assets/vault/badges/master-badge.png" },
            { id: "master-title", type: "Title", name: "Master", image: null }
        ]
    },

    {
        key: "legend",
        name: "Obsidian Vault",
        price: 300000,
        image: "assets/vault/vaults/legend-vault.png",
        items: [
            { id: "legend-crown", type: "Avatar", name: "Legend Crown", image: "assets/vault/avatars/legend-crown.png" },
            { id: "ancient-dragon", type: "Avatar", name: "Ancient Dragon", image: "assets/vault/avatars/ancient-dragon.png" },
            { id: "final-boss", type: "Avatar", name: "Final Boss", image: "assets/vault/avatars/final-boss.png" },

            { id: "hall-of-legends", type: "Banner", name: "Hall of Legends", image: "assets/vault/banners/hall-of-legends.png" },
            { id: "eternal-flame", type: "Banner", name: "Eternal Flame", image: "assets/vault/banners/eternal-flame.png" },
            { id: "god-spark", type: "Banner", name: "God Spark", image: "assets/vault/banners/god-spark.png" },

            { id: "legend-frame", type: "Frame", name: "Legend Frame", image: "assets/vault/frames/legend-frame.png" },
            { id: "legend-badge", type: "Badge", name: "Legend Badge", image: "assets/vault/badges/legend-badge.png" },
            { id: "pryze-legend", type: "Title", name: "Pryze Legend", image: null }
        ]
    }
];

function findVaultCatalogItem(cosmeticId) {
    for (const tier of VAULT_TIERS) {
        const item = tier.items.find(function (i) {
            return i.id === cosmeticId;
        });

        if (item) return { tier: tier, item: item };
    }

    return null;
}

function calculateLevelFromXp(xp) {
    const totalXp = Number(xp) || 0;

    const levelThresholds = [
        0,       // Level 1
        100,     // Level 2
        250,     // Level 3
        450,     // Level 4
        700,     // Level 5
        1000,    // Level 6
        1350,    // Level 7
        1750,    // Level 8
        2100,    // Level 9
        2500,    // Level 10
        8000,    // Level 20 range
        18000,   // Level 30 range
        35000,   // Level 40 range
        60000,   // Level 50 range
        150000,  // Level 75 range
        300000   // Level 100
    ];

    if (totalXp >= 300000) return 100;
    if (totalXp >= 150000) return 75;
    if (totalXp >= 60000) return 50;
    if (totalXp >= 35000) return 40;
    if (totalXp >= 18000) return 30;
    if (totalXp >= 8000) return 20;
    if (totalXp >= 2500) return 10;
    if (totalXp >= 2100) return 9;
    if (totalXp >= 1750) return 8;
    if (totalXp >= 1350) return 7;
    if (totalXp >= 1000) return 6;
    if (totalXp >= 700) return 5;
    if (totalXp >= 450) return 4;
    if (totalXp >= 250) return 3;
    if (totalXp >= 100) return 2;

    return 1;
}

async function awardXpToUser(username, xpAmount) {
    if (!username || !xpAmount) {
        return null;
    }

    const userResult = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .maybeSingle();

    if (!userResult.data) {
        return null;
    }

    const currentXp = Number(userResult.data.xp) || 0;
    const newXp = currentXp + Number(xpAmount);
    const newLevel = calculateLevelFromXp(newXp);

    const updateResult = await supabase
        .from("users")
        .update({
            xp: newXp,
            level: newLevel
        })
        .eq("username", username)
        .select()
        .single();

    if (updateResult.error) {
    console.log("AWARD XP ERROR:", updateResult.error);
    return null;
}

return updateResult.data;
}

async function adjustBalance(username, delta) {
    const result = await supabase.rpc("adjust_balance", {
        p_username: username,
        p_delta: delta
    });

    if (result.error) {
        console.log("ADJUST BALANCE ERROR:", username, delta, result.error.message);
        return { success: false, message: result.error.message };
    }

    return { success: true, balance: result.data };
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

    const candidates = [];

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

        if (battle.type && battle.type !== "friendly") {
            console.log("SKIPPED NON-FRIENDLY BATTLE FOR MATCH:", teamTag, enemyTag, battle.type, battle.battleTime);
            continue;
        }

        const battleId = [
            battle.battleTime,
            cleanTag(teamTag),
            cleanTag(enemyTag)
        ].sort().join("-");

        const teamCrowns = teamPlayer.crowns || 0;
        const enemyCrowns = enemyPlayer.crowns || 0;

        if (teamCrowns === enemyCrowns) {
            candidates.push({
                draw: true,
                battle: battle,
                battleId: battleId,
                battleTime: battle.battleTime
            });
            continue;
        }

        const winnerTag = teamCrowns > enemyCrowns ? teamTag : enemyTag;
        const loserTag = teamCrowns > enemyCrowns ? enemyTag : teamTag;

        candidates.push({
            draw: false,
            winnerTag: winnerTag,
            loserTag: loserTag,
            battle: battle,
            battleId: battleId,
            battleTime: battle.battleTime
        });
    }

    if (candidates.length === 0) {
        return {
            found: false
        };
    }

    return {
        found: true,
        candidates: candidates
    };
}

async function findUnusedBattleCandidate(candidates) {
    for (const candidate of candidates) {
        const usedInMatch = await supabase
            .from("match_results")
            .select("id")
            .eq("clash_battle_id", candidate.battleId)
            .maybeSingle();

        if (usedInMatch.data) continue;

        const usedInTournament = await supabase
            .from("tournament_matches")
            .select("id")
            .eq("clash_battle_id", candidate.battleId)
            .maybeSingle();

        if (usedInTournament.data) continue;

        return candidate;
    }

    return null;
}

async function expireOldMatches() {
    const now = Date.now();

    const waiting = await supabase
        .from("matches")
        .select("id, creator_username, entry_fee")
        .eq("status", "Waiting for opponent")
        .lt("expires_at", now);

    for (const match of waiting.data || []) {
        const updated = await supabase
            .from("matches")
            .update({ status: "Expired" })
            .eq("id", match.id)
            .eq("status", "Waiting for opponent")
            .select()
            .single();

        if (!updated.error && updated.data) {
            await adjustBalance(match.creator_username, Number(match.entry_fee) || 0);
        }
    }

    const ready = await supabase
        .from("matches")
        .select("id, creator_username, opponent_username, entry_fee")
        .eq("status", "Match ready")
        .lt("verify_expires_at", now);

    for (const match of ready.data || []) {
        const updated = await supabase
            .from("matches")
            .update({ status: "Expired" })
            .eq("id", match.id)
            .eq("status", "Match ready")
            .select()
            .single();

        if (!updated.error && updated.data) {
            const fee = Number(match.entry_fee) || 0;

            await adjustBalance(match.creator_username, fee);
            await adjustBalance(match.opponent_username, fee);
        }
    }
}

async function cancelAndRefundTournament(tournamentId, fromStatus) {
    const updated = await supabase
        .from("tournaments")
        .update({ status: "Cancelled" })
        .eq("id", tournamentId)
        .eq("status", fromStatus)
        .select()
        .single();

    if (updated.error || !updated.data) {
        return null;
    }

    const fee = Number(updated.data.entry_fee) || 0;

    if (fee <= 0) {
        return updated.data;
    }

    const players = await supabase
        .from("tournament_players")
        .select("username")
        .eq("tournament_id", tournamentId);

    for (const player of players.data || []) {
        await adjustBalance(player.username, fee);
    }

    return updated.data;
}

async function expireStaleTournaments() {
    const staleCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const staleOpen = await supabase
        .from("tournaments")
        .select("id")
        .eq("status", "Open")
        .neq("tournament_size", SEASON_ZERO_SIZE)
        .lt("created_at", staleCutoff);

    for (const tournament of staleOpen.data || []) {
        await cancelAndRefundTournament(tournament.id, "Open");
    }

    if (Date.now() > SEASON_ZERO_DEADLINE.getTime()) {
        await launchOrCancelSeasonZero();
    }
}

const CLASH_FRIEND_LINK_EXPIRATION_MS = 24 * 60 * 60 * 1000;

async function expireStaleClashLinks() {
    const cutoff = Date.now() - CLASH_FRIEND_LINK_EXPIRATION_MS;

    const stale = await supabase
        .from("users")
        .update({
            clash_friend_link: null,
            clash_friend_link_updated_at: null
        })
        .not("clash_friend_link", "is", null)
        .lt("clash_friend_link_updated_at", cutoff);

    if (stale.error) {
        console.log("EXPIRE CLASH LINKS ERROR:", stale.error);
    }
}

async function expireStaleTournamentMatches() {
    const now = Date.now();

    const stale = await supabase
        .from("tournament_matches")
        .select("id, tournament_id, round_number, player_one, player_two")
        .eq("status", "Ready")
        .lt("verify_expires_at", now);

    for (const match of stale.data || []) {
        const parentTournament = await supabase
            .from("tournaments")
            .select("entry_fee")
            .eq("id", match.tournament_id)
            .maybeSingle();

        const updated = await supabase
            .from("tournament_matches")
            .update({ status: "Cancelled" })
            .eq("id", match.id)
            .eq("status", "Ready")
            .select()
            .single();

        if (updated.error || !updated.data) {
            continue;
        }

        const fee = Number((parentTournament.data && parentTournament.data.entry_fee) || 0);

        if (match.player_one) {
            await adjustBalance(match.player_one, fee);
        }

        if (match.player_two) {
            await adjustBalance(match.player_two, fee);
        }

        await advanceTournamentRoundIfReady(match.tournament_id, match.round_number);
    }
}

async function launchOrCancelSeasonZero() {
    const tournamentResult = await supabase
        .from("tournaments")
        .select("id")
        .eq("status", "Open")
        .eq("tournament_size", SEASON_ZERO_SIZE)
        .maybeSingle();

    if (tournamentResult.error || !tournamentResult.data) {
        return;
    }

    const tournamentId = tournamentResult.data.id;

    const playersResult = await supabase
        .from("tournament_players")
        .select("id")
        .eq("tournament_id", tournamentId);

    const playerCount = (playersResult.data || []).length;

    if (playerCount < 2) {
        await supabase
            .from("tournaments")
            .update({ status: "Cancelled" })
            .eq("id", tournamentId);
        return;
    }

    // No one is kicked: an odd player out gets a bye instead (see
    // buildRoundMatches), so the tournament launches with everyone
    // who joined.
    await supabase
        .from("tournaments")
        .update({
            current_players: playerCount,
            max_players: playerCount,
            status: "Full"
        })
        .eq("id", tournamentId);

    await createTournamentBracket(tournamentId);
}

async function ensureSeasonZeroTournament() {
    const existing = await supabase
        .from("tournaments")
        .select("id")
        .eq("tournament_size", SEASON_ZERO_SIZE)
        .in("status", ["Open", "Full"]);

    if (existing.error) {
        console.log("SEASON ZERO LOOKUP ERROR:", existing.error);
        return;
    }

    if (existing.data && existing.data.length > 0) {
        return;
    }

    const insertResult = await supabase
        .from("tournaments")
        .insert({
            creator_username: "PryzePot",
            game: "Clash Royale",
            tournament_size: SEASON_ZERO_SIZE,
            entry_fee: 0,
            current_players: 0,
            max_players: SEASON_ZERO_SIZE,
            status: "Open",
            winner_username: null
        });

    if (insertResult.error) {
        console.log("CREATE SEASON ZERO ERROR:", insertResult.error);
    }
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

// Pairs entries into a round. An odd one out gets a "bye": a
// pre-completed, one-player match that auto-advances them instead of
// anyone being dropped or kicked.
function buildRoundMatches(entries, tournamentId, roundNumber) {
    const matches = [];

    for (let i = 0; i < entries.length; i += 2) {
        const playerOne = entries[i];
        const playerTwo = entries[i + 1];

        if (!playerOne) continue;

        if (!playerTwo) {
            matches.push({
                tournament_id: tournamentId,
                round_number: roundNumber,

                player_one: playerOne.username,
                player_one_tag: playerOne.tag,
                player_one_friend_link: playerOne.friendLink,

                player_two: null,
                player_two_tag: null,
                player_two_friend_link: null,

                winner_username: playerOne.username,
                winner_tag: playerOne.tag,
                loser_username: null,
                loser_tag: null,

                verified_at: Date.now(),
                clash_battle_id: null,

                status: "Completed"
            });
            continue;
        }

        matches.push({
            tournament_id: tournamentId,
            round_number: roundNumber,

            player_one: playerOne.username,
            player_one_tag: playerOne.tag,
            player_one_friend_link: playerOne.friendLink,

            player_two: playerTwo.username,
            player_two_tag: playerTwo.tag,
            player_two_friend_link: playerTwo.friendLink,

            winner_username: null,
            winner_tag: null,
            loser_username: null,
            loser_tag: null,

            verified_at: null,
            clash_battle_id: null,
            verify_expires_at: Date.now() + ACTIVE_MATCH_EXPIRATION_MINUTES * 60 * 1000,

            status: "Ready"
        });
    }

    return matches;
}

async function advanceTournamentRoundIfReady(tournamentId, roundNumber) {
    const roundMatchesResult = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("round_number", roundNumber)
        .order("id", { ascending: true });

    const roundMatches = roundMatchesResult.data || [];

    const allRoundResolved =
        roundMatches.length > 0 &&
        roundMatches.every(function (match) {
            return match.status === "Completed" || match.status === "Cancelled";
        });

    if (!allRoundResolved) {
        return { advanced: false };
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

    if (winners.length === 0) {
        await supabase
            .from("tournaments")
            .update({ status: "Cancelled" })
            .eq("id", tournamentId)
            .eq("status", "Full");

        return { advanced: true, roundWipedOut: true };
    }

    if (winners.length === 1) {
        const parentTournament = await supabase
            .from("tournaments")
            .select("entry_fee, max_players")
            .eq("id", tournamentId)
            .maybeSingle();

        const tournamentCompletion = await supabase
            .from("tournaments")
            .update({
                winner_username: winners[0].username,
                status: "Completed"
            })
            .eq("id", tournamentId)
            .eq("status", "Full")
            .select()
            .single();

        if (!tournamentCompletion.error && tournamentCompletion.data) {
            const prizePool =
                Number((parentTournament.data && parentTournament.data.entry_fee) || 0) *
                Number((parentTournament.data && parentTournament.data.max_players) || 0);

            if (prizePool > 0) {
                const payout = await adjustBalance(winners[0].username, prizePool);

                if (!payout.success) {
                    console.log("TOURNAMENT PAYOUT ERROR:", winners[0].username, payout.message);
                }
            }
        }

        return { advanced: true, champion: winners[0] };
    }

    const nextRoundNumber = roundNumber + 1;

    const existingNextRound = await supabase
        .from("tournament_matches")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("round_number", nextRoundNumber);

    if (existingNextRound.data && existingNextRound.data.length > 0) {
        return { advanced: true, nextRoundAlreadyExists: true };
    }

    const nextRoundMatches = buildRoundMatches(winners, tournamentId, nextRoundNumber);

    if (nextRoundMatches.length > 0) {
        const nextRoundInsert = await supabase
            .from("tournament_matches")
            .insert(nextRoundMatches);

        const isDuplicatePairing =
            nextRoundInsert.error &&
            nextRoundInsert.error.code === "23505";

        if (nextRoundInsert.error && !isDuplicatePairing) {
            console.log("CREATE NEXT ROUND ERROR:", nextRoundInsert.error);
        }
    }

    return {
        advanced: true,
        nextRoundNumber: nextRoundNumber,
        winnersCount: winners.length
    };
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

    const entries = players.map(function (player) {
        return {
            username: player.username,
            tag: player.player_tag,
            friendLink: player.friend_link
        };
    });

    const bracketMatches = buildRoundMatches(entries, tournamentId, 1);

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

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await supabase
        .from("users")
        .insert({
            username: username,
            email: email,
            password: passwordHash,
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
        token: signToken(newUser.data.username),
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
        .maybeSingle();

    if (foundUser.error) {
        console.log("LOGIN ERROR:", foundUser.error);
    }

    const storedPassword = foundUser.data ? foundUser.data.password : null;
    const isBcryptHash = typeof storedPassword === "string" && storedPassword.startsWith("$2");

    const passwordMatches = isBcryptHash
        ? storedPassword && (await bcrypt.compare(password, storedPassword))
        : storedPassword === password;

    if (foundUser.data && passwordMatches) {
        if (foundUser.data.is_active === false) {
            res.json({
                success: false,
                deactivated: true,
                message: "This account has been deactivated."
            });
            return;
        }

        if (!isBcryptHash) {
            const upgradedHash = await bcrypt.hash(password, 10);

            await supabase
                .from("users")
                .update({ password: upgradedHash })
                .eq("username", foundUser.data.username);
        }

        res.json({
            success: true,
            message: "Login successful!",
            token: signToken(foundUser.data.username),
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

function redirectWithToken(res, user) {
    const token = signToken(user.username);
    const params = new URLSearchParams({
        token: token,
        username: user.username,
        balance: String(user.balance)
    });

    res.redirect(process.env.FRONTEND_URL + "/html/index.html#" + params.toString());
}

async function handleOAuthProfile(res, identity) {
    const existingByProvider = await supabase
        .from("users")
        .select("username, balance")
        .eq("oauth_provider", identity.provider)
        .eq("oauth_id", identity.oauthId)
        .maybeSingle();

    if (existingByProvider.data) {
        redirectWithToken(res, existingByProvider.data);
        return;
    }

    if (identity.email && identity.emailVerified) {
        const existingByEmail = await supabase
            .from("users")
            .select("username, balance")
            .eq("email", identity.email)
            .maybeSingle();

        if (existingByEmail.data) {
            const linkResult = await supabase
                .from("users")
                .update({
                    oauth_provider: identity.provider,
                    oauth_id: identity.oauthId
                })
                .eq("username", existingByEmail.data.username);

            if (linkResult.error) {
                console.log("OAUTH LINK ERROR:", linkResult.error);
            }

            redirectWithToken(res, existingByEmail.data);
            return;
        }
    }

    const pendingToken = signPendingSignup({
        provider: identity.provider,
        oauthId: identity.oauthId,
        email: identity.email
    });

    res.redirect(process.env.FRONTEND_URL + "/html/oauth-username.html#pending=" + encodeURIComponent(pendingToken));
}

app.get("/api/auth/google", function (req, res) {
    const state = signOAuthState("google");
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
        state: state
    });

    res.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString());
});

app.get("/api/auth/google/callback", async function (req, res) {
    const code = req.query.code;
    const state = req.query.state;

    try {
        verifyOAuthState(state, "google");
    } catch (error) {
        res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=state");
        return;
    }

    if (!code) {
        res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=missing_code");
        return;
    }

    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.log("GOOGLE TOKEN ERROR:", tokenData);
            res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=token");
            return;
        }

        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: "Bearer " + tokenData.access_token }
        });

        const profile = await profileResponse.json();

        await handleOAuthProfile(res, {
            provider: "google",
            oauthId: profile.sub,
            email: profile.email,
            emailVerified: profile.email_verified === true
        });
    } catch (error) {
        console.log("GOOGLE OAUTH ERROR:", error);
        res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=server");
    }
});

app.get("/api/auth/discord", function (req, res) {
    const state = signOAuthState("discord");
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: "code",
        scope: "identify email",
        prompt: "consent",
        state: state
    });

    res.redirect("https://discord.com/api/oauth2/authorize?" + params.toString());
});

app.get("/api/auth/discord/callback", async function (req, res) {
    const code = req.query.code;
    const state = req.query.state;

    try {
        verifyOAuthState(state, "discord");
    } catch (error) {
        res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=state");
        return;
    }

    if (!code) {
        res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=missing_code");
        return;
    }

    try {
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: code,
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.log("DISCORD TOKEN ERROR:", tokenData);
            res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=token");
            return;
        }

        const profileResponse = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: "Bearer " + tokenData.access_token }
        });

        const profile = await profileResponse.json();

        await handleOAuthProfile(res, {
            provider: "discord",
            oauthId: profile.id,
            email: profile.email,
            emailVerified: profile.verified === true
        });
    } catch (error) {
        console.log("DISCORD OAUTH ERROR:", error);
        res.redirect(process.env.FRONTEND_URL + "/html/index.html?oauthError=server");
    }
});

app.post("/api/auth/oauth-signup/complete", async function (req, res) {
    const pendingToken = req.body.pendingToken;
    const username = req.body.username;

    if (!pendingToken || !username) {
        res.json({
            success: false,
            message: "Please choose a username."
        });
        return;
    }

    let identity;
    try {
        identity = verifyPendingSignup(pendingToken);
    } catch (error) {
        res.json({
            success: false,
            message: "This sign-up link has expired. Please sign in again."
        });
        return;
    }

    const existingUsername = await supabase
        .from("users")
        .select("username")
        .eq("username", username)
        .maybeSingle();

    if (existingUsername.data) {
        res.json({
            success: false,
            message: "That username is already taken."
        });
        return;
    }

    const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

    const newUser = await supabase
        .from("users")
        .insert({
            username: username,
            email: identity.email || null,
            password: placeholderPassword,
            balance: 0,
            oauth_provider: identity.provider,
            oauth_id: identity.oauthId
        })
        .select()
        .single();

    if (newUser.error) {
        console.log("OAUTH SIGNUP ERROR:", newUser.error);

        res.json({
            success: false,
            message: "Could not create account."
        });
        return;
    }

    res.json({
        success: true,
        message: "Account created!",
        token: signToken(newUser.data.username),
        user: {
            username: newUser.data.username,
            balance: newUser.data.balance
        }
    });
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
    const result = await supabase
        .from("matches")
        .select(
            "id, game, mode, entry_fee, creator_username, creator_tag, creator_friend_link, opponent_username, opponent_tag, opponent_friend_link, status, created_at, expires_at, verify_expires_at, winner_username, winner_tag, loser_username, loser_tag, verified_at"
        )
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
app.post("/api/matches", requireAuth, async function (req, res) {
    const username = req.username;
    const playerTag = req.body.playerTag;
    const friendLink = req.body.friendLink;
    const entryFee = Number(req.body.entryFee);

    if (!username || !playerTag || !friendLink || !(entryFee > 0)) {
        res.json({
            success: false,
            message: "Missing match information."
        });
        return;
    }

    const debit = await adjustBalance(username, -entryFee);

    if (!debit.success) {
        res.json({
            success: false,
            message: "Not enough Vault Credits to post this match."
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

        await adjustBalance(username, entryFee);

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
app.post("/api/tournaments/:id/cancel", requireAuth, async function (req, res) {
    const tournamentId = Number(req.params.id);
    const username = req.username;

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

    const cancelled = await cancelAndRefundTournament(tournamentId, "Open");

    if (!cancelled) {
        res.json({
            success: false,
            message: "This tournament can no longer be cancelled."
        });
        return;
    }

    res.json({
        success: true,
        message: "Tournament cancelled."
    });
});


app.post("/api/tournaments", requireAuth, async function (req, res) {

    const username = req.username;
    const playerTag = req.body.playerTag;
    const friendLink = req.body.friendLink;
    const tournamentSize = req.body.tournamentSize;
    const entryFee = req.body.entryFee;

    if (
        !username ||
        !playerTag ||
        !tournamentSize ||
        entryFee === undefined ||
        entryFee === null ||
        !Number.isFinite(Number(entryFee)) ||
        Number(entryFee) < 0
    ) {
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

    const tournamentEntryFee = Number(entryFee);

    if (tournamentEntryFee > 0) {
        const debit = await adjustBalance(username, -tournamentEntryFee);

        if (!debit.success) {
            res.json({
                success: false,
                message: "Not enough Vault Credits to create this tournament."
            });
            return;
        }
    }

    const tournamentResult = await supabase
        .from("tournaments")
        .insert({
            creator_username: username,
            game: "Clash Royale",
            tournament_size: Number(tournamentSize),
            entry_fee: tournamentEntryFee,
            current_players: 1,
            max_players: Number(tournamentSize),
            status: "Open",
            winner_username: null
        })
        .select()
        .single();

    if (tournamentResult.error) {
        console.log("CREATE TOURNAMENT ERROR:", tournamentResult.error);

        if (tournamentEntryFee > 0) {
            await adjustBalance(username, tournamentEntryFee);
        }

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

        if (tournamentEntryFee > 0) {
            await adjustBalance(username, tournamentEntryFee);
        }

        await supabase
            .from("tournaments")
            .update({ status: "Cancelled" })
            .eq("id", tournamentResult.data.id);

        res.json({
            success: false,
            message: "Tournament could not be created."
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
        .select("id, entry_fee, max_players, current_players, tournament_size, created_at")
        .eq("status", "Open")
        .neq("tournament_size", SEASON_ZERO_SIZE)
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
app.get("/api/tournaments/season-zero", async function (req, res) {
    const result = await supabase
        .from("tournaments")
        .select("id, current_players, max_players, status")
        .eq("tournament_size", SEASON_ZERO_SIZE)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (result.error || !result.data) {
        res.json({
            success: false,
            message: "Season Zero tournament not found."
        });
        return;
    }

    res.json({
        success: true,
        tournament: result.data,
        deadline: SEASON_ZERO_DEADLINE.toISOString()
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
app.post("/api/tournaments/:id/join", requireAuth, async function (req, res) {
    const tournamentId = Number(req.params.id);
    const username = req.username;
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

    const tournamentEntryFee = Number(tournament.entry_fee) || 0;

    if (tournamentEntryFee > 0) {
        const debit = await adjustBalance(username, -tournamentEntryFee);

        if (!debit.success) {
            res.json({
                success: false,
                message: "Not enough Vault Credits to join this tournament."
            });
            return;
        }
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

        if (tournamentEntryFee > 0) {
            await adjustBalance(username, tournamentEntryFee);
        }

        res.json({
            success: false,
            message: "Could not join tournament."
        });
        return;
    }

    const countResult = await supabase
        .from("tournament_players")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournamentId);

    const actualCount = countResult.count || 0;

    if (actualCount > Number(tournament.max_players)) {
        await supabase
            .from("tournament_players")
            .delete()
            .eq("tournament_id", tournamentId)
            .eq("username", username);

        if (tournamentEntryFee > 0) {
            await adjustBalance(username, tournamentEntryFee);
        }

        res.json({
            success: false,
            message: "This tournament is already full."
        });
        return;
    }

    const newStatus =
        actualCount >= Number(tournament.max_players)
            ? "Full"
            : "Open";

    const updateResult = await supabase
        .from("tournaments")
        .update({
            current_players: actualCount,
            status: newStatus
        })
        .eq("id", tournamentId)
        .eq("status", "Open")
        .select()
        .single();

    if (updateResult.error || !updateResult.data) {
        console.log("UPDATE TOURNAMENT COUNT ERROR:", updateResult.error);

        await supabase
            .from("tournament_players")
            .delete()
            .eq("tournament_id", tournamentId)
            .eq("username", username);

        if (tournamentEntryFee > 0) {
            await adjustBalance(username, tournamentEntryFee);
        }

        res.json({
            success: false,
            message: "This tournament is no longer open."
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
app.post("/api/matches/:id/join", requireAuth, async function (req, res) {
    const matchId = Number(req.params.id);
    const username = req.username;
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

    const debit = await adjustBalance(username, -Number(foundMatch.entry_fee));

    if (!debit.success) {
        res.json({
            success: false,
            message: "Not enough Vault Credits to join this match."
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
        .eq("status", "Waiting for opponent")
        .select()
        .single();

    if (update.error || !update.data) {
        console.log("JOIN MATCH ERROR:", update.error);

        await adjustBalance(username, Number(foundMatch.entry_fee));

        res.json({
            success: false,
            message: "This match is no longer open."
        });
        return;
    }

    res.json({
        success: true,
        message: "Match joined!",
        match: dbMatchToFrontend(update.data)
    });
});
app.post("/api/tournament-matches/:id/verify", requireAuth, async function (req, res) {
    const tournamentMatchId = Number(req.params.id);
    const requestingUsername = req.username;

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

    if (
        requestingUsername !== foundMatch.player_one &&
        requestingUsername !== foundMatch.player_two
    ) {
        res.status(403).json({
            success: false,
            message: "Only the players in this match can verify it."
        });
        return;
    }

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

    const parentTournament = await supabase
        .from("tournaments")
        .select("status, entry_fee, max_players")
        .eq("id", foundMatch.tournament_id)
        .maybeSingle();

    if (!parentTournament.data || parentTournament.data.status !== "Full") {
        res.json({
            success: false,
            message: "This tournament is no longer active."
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
        const searchResult = findMatchingBattle(playerOneBattles, fakeMatchForBattleCheck);

        if (!searchResult.found) {
            res.json({
                success: false,
                pending: true,
                message: "No matching Clash battle found yet. Try again in a minute."
            });
            return;
        }

        const result = await findUnusedBattleCandidate(searchResult.candidates);

        if (!result) {
            res.json({
                success: false,
                pending: true,
                message: "This Clash battle was already used. Play a new match before verifying."
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
            .eq("status", "Ready")
            .select()
            .single();

        if (completed.error && completed.error.code === "23505") {
            res.json({
                success: false,
                pending: true,
                message: "This Clash battle was already used. Play a new match before verifying."
            });
            return;
        }

        if (completed.error || !completed.data) {
            const alreadyCompleted = await supabase
                .from("tournament_matches")
                .select("*")
                .eq("id", tournamentMatchId)
                .maybeSingle();

            res.json({
                success: true,
                message: "Tournament match already verified.",
                match: alreadyCompleted.data || foundMatch
            });
            return;
        }

        const advanceResult = await advanceTournamentRoundIfReady(
            foundMatch.tournament_id,
            foundMatch.round_number
        );

        if (!advanceResult.advanced) {
            res.json({
                success: true,
                message: winnerUsername + " won. Waiting for other tournament match.",
                match: completed.data
            });
            return;
        }

        if (advanceResult.champion) {
            const playerState =
                requestingUsername === advanceResult.champion.username
                    ? "champion"
                    : "eliminated";

            res.json({
                success: true,
                champion: requestingUsername === advanceResult.champion.username,
                playerState: playerState,

                message: advanceResult.champion.username + " is the tournament champion!",

                winnerUsername: advanceResult.champion.username,
                winnerTag: advanceResult.champion.tag,

                loserUsername: loserUsername,
                loserTag: loserTag,

                match: completed.data
            });
            return;
        }

        if (advanceResult.roundWipedOut) {
            res.json({
                success: true,
                message: winnerUsername + " won, but the rest of this round couldn't be completed. Tournament cancelled.",
                match: completed.data
            });
            return;
        }

        const nextRoundLabel =
            advanceResult.winnersCount === 2
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
app.post("/api/matches/:id/verify", requireAuth, async function (req, res) {
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

    if (
        req.username !== foundMatch.creator_username &&
        req.username !== foundMatch.opponent_username
    ) {
        res.status(403).json({
            success: false,
            message: "Only the players in this match can verify it."
        });
        return;
    }

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
        const searchResult = findMatchingBattle(creatorBattles, foundMatch);

        if (!searchResult.found) {
            res.json({
                success: false,
                pending: true,
                message: "No matching battle found yet. Try again in a minute."
            });
            return;
        }

        const result = await findUnusedBattleCandidate(searchResult.candidates);

        if (!result) {
            res.json({
                success: false,
                pending: true,
                message: "This Clash battle was already used. Play a new match before verifying."
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
                .eq("status", "Match ready")
                .select()
                .single();

            if (drawUpdate.error || !drawUpdate.data) {
                const alreadyVerified = await supabase
                    .from("matches")
                    .select("*")
                    .eq("id", matchId)
                    .maybeSingle();

                const currentMatch = alreadyVerified.data || foundMatch;

                res.json({
                    success: true,
                    draw: currentMatch.status === "Draw",
                    message: "Match already verified.",
                    match: dbMatchToFrontend(currentMatch)
                });
                return;
            }

            const drawFee = Number(drawUpdate.data.entry_fee) || 0;

            await adjustBalance(drawUpdate.data.creator_username, drawFee);
            await adjustBalance(drawUpdate.data.opponent_username, drawFee);

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

        if (!winnerUsername) {
            res.json({
                success: false,
                message: "Could not determine match winner."
            });
            return;
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
            .eq("status", "Match ready")
            .select()
            .single();

        if (completed.error || !completed.data) {
            const alreadyCompleted = await supabase
                .from("matches")
                .select("*")
                .eq("id", matchId)
                .maybeSingle();

            res.json({
                success: true,
                message: "Match already verified.",
                match: dbMatchToFrontend(alreadyCompleted.data || foundMatch)
            });
            return;
        }

        const resultInsert = await supabase
            .from("match_results")
            .insert({
                match_id: matchId,
                clash_battle_id: result.battleId,
                winner_username: winnerUsername,
                winner_tag: winnerTag,
                loser_username: loserUsername,
                loser_tag: loserTag
            });

        if (resultInsert.error && resultInsert.error.code === "23505") {
            await supabase
                .from("matches")
                .update({
                    status: "Match ready",
                    winner_username: null,
                    winner_tag: null,
                    loser_username: null,
                    loser_tag: null,
                    verified_at: null
                })
                .eq("id", matchId);

            res.json({
                success: false,
                pending: true,
                message: "This Clash battle was already used. Play a new match before verifying."
            });
            return;
        }

        if (resultInsert.error) {
            console.log("MATCH RESULT INSERT ERROR:", resultInsert.error);
        }

        const payout = await adjustBalance(winnerUsername, Number(completed.data.entry_fee) * 2);

        if (!payout.success) {
            console.log("MATCH PAYOUT ERROR:", winnerUsername, payout.message);
        }

        const winnerXpEarned = getMatchXpForResult("win");
const loserXpEarned = getMatchXpForResult("loss");

const winnerXpProfile = await awardXpToUser(winnerUsername, winnerXpEarned);
const loserXpProfile = await awardXpToUser(loserUsername, loserXpEarned);

        res.json({
    success: true,
    message: winnerUsername + " won the match!",
    winnerUsername: winnerUsername,
    loserUsername: loserUsername,
    winnerXpEarned: winnerXpEarned,
    loserXpEarned: loserXpEarned,
    winnerProfile: winnerXpProfile,
    loserProfile: loserXpProfile,
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

app.post("/api/matches/:id/cancel", requireAuth, async function (req, res) {
    const matchId = Number(req.params.id);
    const username = req.username;

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

    const cancelled = await supabase
        .from("matches")
        .update({ status: "Cancelled" })
        .eq("id", matchId)
        .eq("status", "Waiting for opponent")
        .select()
        .single();

    if (cancelled.error || !cancelled.data) {
        res.json({
            success: false,
            message: "You cannot cancel after an opponent joins."
        });
        return;
    }

    await adjustBalance(username, Number(cancelled.data.entry_fee));

    res.json({
        success: true,
        message: "Match cancelled."
    });
});

app.get("/api/matches/:id", async function (req, res) {
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

    const match = dbMatchToFrontend(found.data);

    const creatorProfile = await supabase
        .from("users")
        .select("username, profile_picture, profile_banner, level, xp")
        .eq("username", match.creatorUsername)
        .maybeSingle();

    let opponentProfile = {
        data: null
    };

    if (match.opponentUsername) {
        opponentProfile = await supabase
            .from("users")
            .select("username, profile_picture, profile_banner, level, xp")
            .eq("username", match.opponentUsername)
            .maybeSingle();
    }

    match.creatorProfile = creatorProfile.data || null;
    match.opponentProfile = opponentProfile.data || null;

    res.json({
        success: true,
        match: match
    });
});
app.post("/api/users/save-clash", requireAuth, async function (req, res) {

    const username = req.username;
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
            clash_verified: true,
            clash_friend_link_updated_at: Date.now()
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
app.post("/api/users/save-profile", requireAuth, async function (req, res) {
    const username = req.username;
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

async function verifyCurrentPassword(username, currentPassword) {
    const foundUser = await supabase
        .from("users")
        .select("password")
        .eq("username", username)
        .maybeSingle();

    const storedPassword = foundUser.data ? foundUser.data.password : null;
    const isBcryptHash = typeof storedPassword === "string" && storedPassword.startsWith("$2");

    return isBcryptHash
        ? storedPassword && (await bcrypt.compare(currentPassword, storedPassword))
        : storedPassword === currentPassword;
}

app.post("/api/users/change-email", requireAuth, async function (req, res) {
    const username = req.username;
    const newEmail = req.body.newEmail;
    const currentPassword = req.body.currentPassword;

    if (!newEmail || !currentPassword) {
        res.json({
            success: false,
            message: "Please enter your new email and current password."
        });
        return;
    }

    const passwordMatches = await verifyCurrentPassword(username, currentPassword);

    if (!passwordMatches) {
        res.json({
            success: false,
            message: "Current password is incorrect."
        });
        return;
    }

    const existingEmail = await supabase
        .from("users")
        .select("username")
        .eq("email", newEmail)
        .neq("username", username)
        .maybeSingle();

    if (existingEmail.data) {
        res.json({
            success: false,
            message: "An account with this email already exists."
        });
        return;
    }

    const result = await supabase
        .from("users")
        .update({ email: newEmail })
        .eq("username", username)
        .select("username, email")
        .single();

    if (result.error) {
        console.log("CHANGE EMAIL ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not update email."
        });
        return;
    }

    res.json({
        success: true,
        message: "Email updated.",
        user: result.data
    });
});

app.post("/api/users/change-password", requireAuth, async function (req, res) {
    const username = req.username;
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    if (!currentPassword || !newPassword) {
        res.json({
            success: false,
            message: "Please enter your current and new password."
        });
        return;
    }

    if (newPassword.length < 6) {
        res.json({
            success: false,
            message: "New password must be at least 6 characters."
        });
        return;
    }

    const passwordMatches = await verifyCurrentPassword(username, currentPassword);

    if (!passwordMatches) {
        res.json({
            success: false,
            message: "Current password is incorrect."
        });
        return;
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const result = await supabase
        .from("users")
        .update({ password: newPasswordHash })
        .eq("username", username);

    if (result.error) {
        console.log("CHANGE PASSWORD ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not update password."
        });
        return;
    }

    res.json({
        success: true,
        message: "Password updated."
    });
});

app.post("/api/users/deactivate", requireAuth, async function (req, res) {
    const username = req.username;
    const currentPassword = req.body.currentPassword;

    if (!currentPassword) {
        res.json({
            success: false,
            message: "Please enter your password to deactivate your account."
        });
        return;
    }

    const passwordMatches = await verifyCurrentPassword(username, currentPassword);

    if (!passwordMatches) {
        res.json({
            success: false,
            message: "Current password is incorrect."
        });
        return;
    }

    const result = await supabase
        .from("users")
        .update({
            is_active: false,
            deactivated_at: new Date().toISOString()
        })
        .eq("username", username);

    if (result.error) {
        console.log("DEACTIVATE ACCOUNT ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not deactivate account."
        });
        return;
    }

    res.json({
        success: true,
        message: "Account deactivated."
    });
});

app.post("/api/users/reactivate", async function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    const foundUser = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    const storedPassword = foundUser.data ? foundUser.data.password : null;
    const isBcryptHash = typeof storedPassword === "string" && storedPassword.startsWith("$2");

    const passwordMatches = isBcryptHash
        ? storedPassword && (await bcrypt.compare(password, storedPassword))
        : storedPassword === password;

    if (!foundUser.data || !passwordMatches) {
        res.json({
            success: false,
            message: "Invalid email or password."
        });
        return;
    }

    if (foundUser.data.is_active !== false) {
        res.json({
            success: false,
            message: "This account is already active."
        });
        return;
    }

    const result = await supabase
        .from("users")
        .update({
            is_active: true,
            deactivated_at: null
        })
        .eq("username", foundUser.data.username);

    if (result.error) {
        console.log("REACTIVATE ACCOUNT ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not reactivate account."
        });
        return;
    }

    res.json({
        success: true,
        message: "Account reactivated.",
        token: signToken(foundUser.data.username),
        user: {
            username: foundUser.data.username,
            balance: foundUser.data.balance
        }
    });
});

app.post("/api/users/delete-account", requireAuth, async function (req, res) {
    const username = req.username;
    const currentPassword = req.body.currentPassword;

    if (!currentPassword) {
        res.json({
            success: false,
            message: "Please enter your password to delete your account."
        });
        return;
    }

    const passwordMatches = await verifyCurrentPassword(username, currentPassword);

    if (!passwordMatches) {
        res.json({
            success: false,
            message: "Current password is incorrect."
        });
        return;
    }

    const result = await supabase
        .from("users")
        .delete()
        .eq("username", username);

    if (result.error) {
        console.log("DELETE ACCOUNT ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not delete account."
        });
        return;
    }

    res.json({
        success: true,
        message: "Account permanently deleted."
    });
});

app.get("/api/users/:username/cosmetics", async function (req, res) {
    const username = req.params.username;

    const userResult = await supabase
        .from("users")
        .select("username, level, xp, equipped_avatar, equipped_banner, equipped_frame, equipped_badge, equipped_title")
        .eq("username", username)
        .maybeSingle();

    if (userResult.error || !userResult.data) {
        res.json({
            success: false,
            message: "User not found."
        });
        return;
    }

    const cosmeticsResult = await supabase
        .from("user_cosmetics")
        .select("*")
        .eq("username", username);

    if (cosmeticsResult.error) {
        console.log("LOAD COSMETICS ERROR:", cosmeticsResult.error);

        res.json({
            success: false,
            message: "Could not load cosmetics."
        });
        return;
    }

    res.json({
        success: true,
        user: userResult.data,
        cosmetics: cosmeticsResult.data || []
    });
});

app.post("/api/users/equip-cosmetic", requireAuth, async function (req, res) {
    const username = req.username;
    const cosmeticType = req.body.cosmeticType;
    const cosmeticId = req.body.cosmeticId;

    if (!username || !cosmeticType) {
        res.json({
            success: false,
            message: "Missing cosmetic information."
        });
        return;
    }

    const allowedTypes = ["Avatar", "Banner", "Frame", "Badge", "Title"];

    if (!allowedTypes.includes(cosmeticType)) {
        res.json({
            success: false,
            message: "Invalid cosmetic type."
        });
        return;
    }

    const updatePayload = {};

    if (cosmeticType === "Avatar") {
        updatePayload.equipped_avatar = cosmeticId || null;
    }

    if (cosmeticType === "Banner") {
        updatePayload.equipped_banner = cosmeticId || null;
    }

    if (cosmeticType === "Frame") {
        updatePayload.equipped_frame = cosmeticId || null;
    }

    if (cosmeticType === "Badge") {
        updatePayload.equipped_badge = cosmeticId || null;
    }

    if (cosmeticType === "Title") {
        updatePayload.equipped_title = cosmeticId || null;
    }

    if (!cosmeticId) {
        const unequipResult = await supabase
            .from("users")
            .update(updatePayload)
            .eq("username", username)
            .select()
            .single();

        if (unequipResult.error) {
            console.log("UNEQUIP COSMETIC ERROR:", unequipResult.error);

            res.json({
                success: false,
                message: "Could not unequip cosmetic."
            });
            return;
        }

        res.json({
            success: true,
            message: "Cosmetic unequipped.",
            user: unequipResult.data
        });
        return;
    }

    const ownedResult = await supabase
        .from("user_cosmetics")
        .select("*")
        .eq("username", username)
        .eq("cosmetic_id", cosmeticId)
        .maybeSingle();

    if (!ownedResult.data) {
        res.json({
            success: false,
            message: "You have not unlocked this cosmetic yet."
        });
        return;
    }

    const updateResult = await supabase
        .from("users")
        .update(updatePayload)
        .eq("username", username)
        .select()
        .single();

    if (updateResult.error) {
        console.log("EQUIP COSMETIC ERROR:", updateResult.error);

        res.json({
            success: false,
            message: "Could not equip cosmetic."
        });
        return;
    }

    res.json({
        success: true,
        message: "Cosmetic equipped.",
        user: updateResult.data
    });
});
app.get("/api/vault/catalog", async function (req, res) {
    res.json({
        success: true,
        tiers: VAULT_TIERS.map(function (tier) {
            return {
                key: tier.key,
                name: tier.name,
                price: tier.price,
                image: tier.image,
                items: tier.items
            };
        })
    });
});
app.post("/api/users/purchase-cosmetic", requireAuth, async function (req, res) {
    const username = req.username;
    const cosmeticId = req.body.cosmeticId;

    if (!cosmeticId) {
        res.json({
            success: false,
            message: "Missing cosmetic id."
        });
        return;
    }

    const found = findVaultCatalogItem(cosmeticId);

    if (!found) {
        res.json({
            success: false,
            message: "This item is not in the Vault catalog."
        });
        return;
    }

    const ownedResult = await supabase
        .from("user_cosmetics")
        .select("cosmetic_id")
        .eq("username", username)
        .eq("cosmetic_id", cosmeticId)
        .maybeSingle();

    if (ownedResult.data) {
        res.json({
            success: false,
            message: "You already own this item."
        });
        return;
    }

    const price = found.tier.price;
    const debit = await adjustBalance(username, -price);

    if (!debit.success) {
        res.json({
            success: false,
            message: "Not enough Vault Credits to purchase this item."
        });
        return;
    }

    const grantResult = await supabase
        .from("user_cosmetics")
        .upsert({
            username: username,
            cosmetic_id: found.item.id,
            cosmetic_type: found.item.type,
            cosmetic_name: found.item.name,
            cosmetic_image: found.item.image
        }, {
            onConflict: "username,cosmetic_id"
        });

    if (grantResult.error) {
        console.log("PURCHASE COSMETIC GRANT ERROR:", grantResult.error);
        await adjustBalance(username, price);

        res.json({
            success: false,
            message: "Could not complete purchase. Please try again."
        });
        return;
    }

    res.json({
        success: true,
        message: "Purchase complete.",
        balance: debit.balance,
        cosmetic: found.item
    });
});
app.get("/api/leaderboard", async function (req, res) {
    const game = req.query.game || "all";
    const time = req.query.time || "all";

    if (game !== "all" && game !== "clash") {
        res.json({
            success: true,
            players: []
        });
        return;
    }

    let startTime = 0;
    const now = Date.now();

    if (time === "day") {
        startTime = now - 24 * 60 * 60 * 1000;
    }

    if (time === "week") {
        startTime = now - 7 * 24 * 60 * 60 * 1000;
    }

    if (time === "month") {
        startTime = now - 30 * 24 * 60 * 60 * 1000;
    }

    const usersResult = await supabase
        .from("users")
        .select("username, profile_picture, profile_banner, equipped_frame, xp");

    if (usersResult.error) {
        console.log("LEADERBOARD USERS ERROR:", usersResult.error);

        res.json({
            success: false,
            message: "Could not load leaderboard users."
        });
        return;
    }

    let completedMatchesQuery = supabase
        .from("matches")
        .select("entry_fee, winner_username, loser_username, status, verified_at")
        .eq("status", "Completed");

    let completedTournamentsQuery = supabase
        .from("tournaments")
        .select("entry_fee, max_players, winner_username, status")
        .eq("status", "Completed");

    let tournamentMatchWinsQuery = supabase
        .from("tournament_matches")
        .select("winner_username, loser_username, status, verified_at")
        .eq("status", "Completed");

    if (startTime > 0) {
        completedMatchesQuery = completedMatchesQuery.gte("verified_at", startTime);
        tournamentMatchWinsQuery = tournamentMatchWinsQuery.gte("verified_at", startTime);
    }

    const completedMatches = await completedMatchesQuery;
    const completedTournaments = await completedTournamentsQuery;
    const tournamentMatchWins = await tournamentMatchWinsQuery;

    if (completedMatches.error || completedTournaments.error || tournamentMatchWins.error) {
        console.log("LEADERBOARD STATS ERROR:", {
            matches: completedMatches.error,
            tournaments: completedTournaments.error,
            tournamentMatches: tournamentMatchWins.error
        });

        res.json({
            success: false,
            message: "Could not load leaderboard stats."
        });
        return;
    }

    const statsByUser = {};

    function ensureUser(username) {
        if (!username) return null;

        if (!statsByUser[username]) {
            statsByUser[username] = {
                username: username,
                lifetime_winnings: 0,
                one_v_one_wins: 0,
                one_v_one_losses: 0,
                tournament_wins: 0,
                tournament_match_wins: 0,
                tournament_match_losses: 0
            };
        }

        return statsByUser[username];
    }

    (completedMatches.data || []).forEach(function (match) {
        const winner = ensureUser(match.winner_username);
        const loser = ensureUser(match.loser_username);

        if (winner) {
            winner.one_v_one_wins += 1;
            winner.lifetime_winnings += Number(match.entry_fee || 0) * 2;
        }

        if (loser) {
            loser.one_v_one_losses += 1;
        }
    });

    (completedTournaments.data || []).forEach(function (tournament) {
        const winner = ensureUser(tournament.winner_username);

        if (winner) {
            winner.tournament_wins += 1;
            winner.lifetime_winnings += Number(tournament.entry_fee || 0) * Number(tournament.max_players || 0);
        }
    });

    (tournamentMatchWins.data || []).forEach(function (match) {
        const winner = ensureUser(match.winner_username);
        const loser = ensureUser(match.loser_username);

        if (winner) {
            winner.tournament_match_wins += 1;
        }

        if (loser) {
            loser.tournament_match_losses += 1;
        }
    });

    const players = (usersResult.data || []).map(function (user) {
        const stats = ensureUser(user.username);

        return {
            username: user.username,
            profile_picture: user.profile_picture || "avatar1",
profile_banner: user.profile_banner || "banner1",
equipped_frame: user.equipped_frame || null,
xp: Number(user.xp) || 0,
            level: calculateLevelFromXp(user.xp || 0),
            lifetime_winnings: stats ? stats.lifetime_winnings : 0,
            one_v_one_wins: stats ? stats.one_v_one_wins : 0,
            one_v_one_losses: stats ? stats.one_v_one_losses : 0,
            tournament_wins: stats ? stats.tournament_wins : 0,
            tournament_match_wins: stats ? stats.tournament_match_wins : 0,
            tournament_match_losses: stats ? stats.tournament_match_losses : 0
        };
    });

    players.sort(function (a, b) {
        if (Number(b.lifetime_winnings) !== Number(a.lifetime_winnings)) {
            return Number(b.lifetime_winnings) - Number(a.lifetime_winnings);
        }

        return Number(b.xp) - Number(a.xp);
    });

    const rankedPlayers = players.map(function (player, index) {
        return {
            rank: index + 1,
            ...player
        };
    });

    res.json({
        success: true,
        game: game,
        time: time,
        players: rankedPlayers
    });
});
app.get("/api/users/search/:query", async function (req, res) {

    const query = req.params.query.trim();

    if (!query || query.length < 2) {
        res.json({
            success: true,
            users: []
        });
        return;
    }

    const result = await supabase
        .from("users")
        .select("username, profile_picture, equipped_avatar, level")
        .ilike("username", query + "%")
        .limit(15);

    if (result.error) {
        console.log(result.error);

        res.json({
            success: false,
            users: []
        });

        return;
    }

    res.json({
        success: true,
        users: result.data || []
    });

});
app.get("/api/users/:username/profile", async function (req, res) {
    const username = req.params.username;

    const result = await supabase
        .from("users")
        .select(
            "username, balance, profile_picture, profile_banner, profile_completed, xp, level, created_at, last_seen, equipped_avatar, equipped_banner, equipped_frame, equipped_badge, equipped_title, clash_tag, clash_name, clash_friend_link, clash_trophies, clash_exp_level, clash_verified, clash_friend_link_updated_at"
        )
        .eq("username", username)
        .maybeSingle();

    if (!result.data) {
        res.json({
            success: false,
            message: "User not found."
        });
        return;
    }

    const user = result.data;
    const xp = Number(user.xp) || 0;
    const level = calculateLevelFromXp(xp);

    const levelThresholds = {
        1: 0,
        2: 100,
        3: 250,
        4: 450,
        5: 700,
        6: 1000,
        7: 1350,
        8: 1750,
        9: 2100,
        10: 2500,
        20: 8000,
        30: 18000,
        40: 35000,
        50: 60000,
        75: 150000,
        100: 300000
    };

    let currentLevelXp = levelThresholds[level] || 0;
    let nextLevel = level + 1;
    let nextLevelXp = levelThresholds[nextLevel];

    if (!nextLevelXp) {
        nextLevelXp = currentLevelXp + 500;
    }

    if (level >= 100) {
        nextLevel = 100;
        nextLevelXp = 300000;
        currentLevelXp = 300000;
    }

    const progressXp = Math.max(0, xp - currentLevelXp);
    const neededXp = Math.max(1, nextLevelXp - currentLevelXp);
    const progressPercent =
        level >= 100
            ? 100
            : Math.min(100, Math.floor((progressXp / neededXp) * 100));

    const normalWins = await supabase
        .from("match_results")
        .select("id")
        .eq("winner_username", username);

    const normalLosses = await supabase
        .from("match_results")
        .select("id")
        .eq("loser_username", username);

    const tournamentMatchWins = await supabase
        .from("tournament_matches")
        .select("id")
        .eq("winner_username", username)
        .eq("status", "Completed");

    const tournamentWins = await supabase
        .from("tournaments")
        .select("id, entry_fee, max_players")
        .eq("winner_username", username)
        .eq("status", "Completed");

    const completedWins = await supabase
        .from("matches")
        .select("entry_fee")
        .eq("winner_username", username)
        .eq("status", "Completed");

    let lifetimeWinnings = 0;

    if (completedWins.data) {
        completedWins.data.forEach(function (match) {
            lifetimeWinnings += Number(match.entry_fee || 0) * 2;
        });
    }

    if (tournamentWins.data) {
        tournamentWins.data.forEach(function (tournament) {
            lifetimeWinnings += Number(tournament.entry_fee || 0) * Number(tournament.max_players || 0);
        });
    }

    res.json({
        success: true,
        user: {
    username: user.username,
    balance: user.balance || 0,

    profile_picture: user.profile_picture || "avatar1",
    profile_banner: user.profile_banner || "banner1",

    equipped_avatar: user.equipped_avatar || null,
    equipped_banner: user.equipped_banner || null,
    equipped_frame: user.equipped_frame || null,
    equipped_badge: user.equipped_badge || null,
    equipped_title: user.equipped_title || null,

    clash_tag: user.clash_tag || null,
    clash_name: user.clash_name || null,
    clash_friend_link: user.clash_friend_link || null,
    clash_trophies: user.clash_trophies || null,
    clash_exp_level: user.clash_exp_level || null,
    clash_verified: user.clash_verified || false,
    clash_friend_link_updated_at: user.clash_friend_link_updated_at || null,

    profile_completed: user.profile_completed || false,

    xp: xp,
    level: level,

    created_at: user.created_at,
    last_seen: user.last_seen || 0,

    stats: {
        lifetime_winnings: lifetimeWinnings,
        one_v_one_wins: normalWins.data ? normalWins.data.length : 0,
        one_v_one_losses: normalLosses.data ? normalLosses.data.length : 0,
        tournament_match_wins: tournamentMatchWins.data ? tournamentMatchWins.data.length : 0,
        tournament_wins: tournamentWins.data ? tournamentWins.data.length : 0
    },

    xp_progress: {
        current_xp: xp,
        current_level: level,
        current_level_xp: currentLevelXp,
        next_level: nextLevel,
        next_level_xp: nextLevelXp,
        progress_xp: progressXp,
        needed_xp: neededXp,
        progress_percent: progressPercent
    }
}
    });
});
app.post("/api/users/profiles-batch", async function (req, res) {
    const usernames = Array.isArray(req.body.usernames) ? req.body.usernames : [];

    const cleanUsernames = usernames
        .filter(function (username) {
            return typeof username === "string" && username.length > 0;
        })
        .slice(0, 100);

    if (cleanUsernames.length === 0) {
        res.json({
            success: true,
            profiles: {}
        });
        return;
    }

    const result = await supabase
        .from("users")
        .select(
            "username, balance, profile_picture, profile_banner, equipped_avatar, equipped_banner, equipped_frame, equipped_badge, equipped_title, xp, level, last_seen"
        )
        .in("username", cleanUsernames);

    if (result.error) {
        console.log("LOAD BATCH PROFILES ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not load profiles."
        });
        return;
    }

    const profiles = {};

    (result.data || []).forEach(function (user) {
        const xp = Number(user.xp) || 0;

        profiles[user.username] = {
            username: user.username,
            balance: user.balance || 0,
            profile_picture: user.profile_picture || "avatar1",
            profile_banner: user.profile_banner || "banner1",
            equipped_avatar: user.equipped_avatar || null,
            equipped_banner: user.equipped_banner || null,
            equipped_frame: user.equipped_frame || null,
            equipped_badge: user.equipped_badge || null,
            equipped_title: user.equipped_title || null,
            xp: xp,
            level: calculateLevelFromXp(xp),
            last_seen: user.last_seen || 0
        };
    });

    res.json({
        success: true,
        profiles: profiles
    });
});

function normalizeFriendPair(usernameOne, usernameTwo) {
    const names = [usernameOne, usernameTwo].sort();

    return {
        userOne: names[0],
        userTwo: names[1]
    };
}

app.post("/api/friends/request", requireAuth, async function (req, res) {
    const senderUsername = req.username;
    const receiverUsername = req.body.receiverUsername;

    if (!senderUsername || !receiverUsername) {
        res.json({
            success: false,
            message: "Missing friend request information."
        });
        return;
    }

    if (senderUsername === receiverUsername) {
        res.json({
            success: false,
            message: "You cannot add yourself."
        });
        return;
    }

    const receiverResult = await supabase
        .from("users")
        .select("username")
        .eq("username", receiverUsername)
        .maybeSingle();

    if (!receiverResult.data) {
        res.json({
            success: false,
            message: "Player not found."
        });
        return;
    }

    const pair = normalizeFriendPair(senderUsername, receiverUsername);

    const existingFriend = await supabase
        .from("friends")
        .select("*")
        .eq("user_one", pair.userOne)
        .eq("user_two", pair.userTwo)
        .maybeSingle();

    if (existingFriend.data) {
        res.json({
            success: false,
            message: "You are already friends."
        });
        return;
    }

    const existingRequest = await supabase
        .from("friend_requests")
        .select("*")
        .eq("sender_username", senderUsername)
        .eq("receiver_username", receiverUsername)
        .eq("status", "pending")
        .maybeSingle();

    if (existingRequest.data) {
        res.json({
            success: false,
            message: "Friend request already sent."
        });
        return;
    }

    const reverseRequest = await supabase
        .from("friend_requests")
        .select("*")
        .eq("sender_username", receiverUsername)
        .eq("receiver_username", senderUsername)
        .eq("status", "pending")
        .maybeSingle();

    if (reverseRequest.data) {
        res.json({
            success: false,
            message: "This player already sent you a friend request."
        });
        return;
    }

    const insertResult = await supabase
        .from("friend_requests")
        .insert({
            sender_username: senderUsername,
            receiver_username: receiverUsername,
            status: "pending"
        })
        .select()
        .single();

    if (insertResult.error) {
        console.log("SEND FRIEND REQUEST ERROR:", insertResult.error);

        res.json({
            success: false,
            message: "Could not send friend request."
        });
        return;
    }

    res.json({
        success: true,
        message: "Friend request sent.",
        request: insertResult.data
    });
});

app.get("/api/friends/requests/:username", requireAuth, async function (req, res) {
    const username = req.params.username;

    if (req.username !== username) {
        res.status(403).json({
            success: false,
            message: "You cannot view another user's friend requests."
        });
        return;
    }

    const result = await supabase
        .from("friend_requests")
        .select("*")
        .eq("receiver_username", username)
        .eq("status", "pending")
        .order("id", { ascending: false });

    if (result.error) {
        res.json({
            success: false,
            message: "Could not load friend requests."
        });
        return;
    }

    res.json({
        success: true,
        requests: result.data || []
    });
});

app.post("/api/friends/requests/:id/accept", requireAuth, async function (req, res) {
    const requestId = Number(req.params.id);
    const username = req.username;

    const requestResult = await supabase
        .from("friend_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

    if (!requestResult.data) {
        res.json({
            success: false,
            message: "Friend request not found."
        });
        return;
    }

    const request = requestResult.data;

    if (request.receiver_username !== username) {
        res.json({
            success: false,
            message: "You cannot accept this request."
        });
        return;
    }

    if (request.status !== "pending") {
        res.json({
            success: false,
            message: "This request is no longer pending."
        });
        return;
    }

    const pair = normalizeFriendPair(
        request.sender_username,
        request.receiver_username
    );

    const friendResult = await supabase
        .from("friends")
        .insert({
            user_one: pair.userOne,
            user_two: pair.userTwo
        });

    if (friendResult.error) {
        console.log("CREATE FRIEND ERROR:", friendResult.error);
    }

    await supabase
        .from("friend_requests")
        .update({
            status: "accepted",
            updated_at: Date.now()
        })
        .eq("id", requestId);

    res.json({
        success: true,
        message: "Friend request accepted."
    });
});

app.post("/api/friends/requests/:id/decline", requireAuth, async function (req, res) {
    const requestId = Number(req.params.id);
    const username = req.username;

    const requestResult = await supabase
        .from("friend_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

    if (!requestResult.data) {
        res.json({
            success: false,
            message: "Friend request not found."
        });
        return;
    }

    const request = requestResult.data;

    if (request.receiver_username !== username) {
        res.json({
            success: false,
            message: "You cannot decline this request."
        });
        return;
    }

    await supabase
        .from("friend_requests")
        .update({
            status: "declined",
            updated_at: Date.now()
        })
        .eq("id", requestId);

    res.json({
        success: true,
        message: "Friend request declined."
    });
});

app.get("/api/friends/:username", requireAuth, async function (req, res) {
    const username = req.params.username;

    if (req.username !== username) {
        res.status(403).json({
            success: false,
            message: "You cannot view another user's friends list."
        });
        return;
    }

    const result = await supabase
        .from("friends")
        .select("*")
        .or("user_one.eq." + username + ",user_two.eq." + username)
        .order("id", { ascending: false });

    if (result.error) {
        res.json({
            success: false,
            message: "Could not load friends."
        });
        return;
    }

    const friends = (result.data || []).map(function (friendship) {
        return friendship.user_one === username
            ? friendship.user_two
            : friendship.user_one;
    });

    res.json({
        success: true,
        friends: friends
    });
});

app.get("/api/friends/status/:viewerUsername/:profileUsername", requireAuth, async function (req, res) {
    const viewerUsername = req.params.viewerUsername;
    const profileUsername = req.params.profileUsername;

    if (req.username !== viewerUsername) {
        res.status(403).json({
            success: false,
            message: "You cannot view this friend status."
        });
        return;
    }

    if (viewerUsername === profileUsername) {
        res.json({
            success: true,
            status: "self"
        });
        return;
    }

    const pair = normalizeFriendPair(viewerUsername, profileUsername);

    const friendResult = await supabase
        .from("friends")
        .select("*")
        .eq("user_one", pair.userOne)
        .eq("user_two", pair.userTwo)
        .maybeSingle();

    if (friendResult.data) {
        res.json({
            success: true,
            status: "friends"
        });
        return;
    }

    const sentRequest = await supabase
        .from("friend_requests")
        .select("*")
        .eq("sender_username", viewerUsername)
        .eq("receiver_username", profileUsername)
        .eq("status", "pending")
        .maybeSingle();

    if (sentRequest.data) {
        res.json({
            success: true,
            status: "request_sent"
        });
        return;
    }

    const receivedRequest = await supabase
        .from("friend_requests")
        .select("*")
        .eq("sender_username", profileUsername)
        .eq("receiver_username", viewerUsername)
        .eq("status", "pending")
        .maybeSingle();

    if (receivedRequest.data) {
        res.json({
            success: true,
            status: "request_received",
            requestId: receivedRequest.data.id
        });
        return;
    }

    res.json({
        success: true,
        status: "none"
    });
});
app.post("/api/users/heartbeat", requireAuth, async function (req, res) {
    const username = req.username;

    if (!username) {
        res.json({
            success: false,
            message: "Missing username."
        });
        return;
    }

    await supabase
        .from("users")
        .update({
            last_seen: Date.now()
        })
        .eq("username", username);

    res.json({
        success: true
    });
});

app.post("/api/users/daily-reward", requireAuth, async function (req, res) {
    const username = req.username;

    const foundUser = await supabase
        .from("users")
        .select("balance, login_streak, last_reward_date")
        .eq("username", username)
        .maybeSingle();

    if (foundUser.error || !foundUser.data) {
        res.json({
            success: false,
            message: "Could not load user."
        });
        return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const currentStreak = foundUser.data.login_streak || 0;
    const lastRewardDate = foundUser.data.last_reward_date;
    const currentBalance = foundUser.data.balance || 0;

    if (lastRewardDate === today) {
        res.json({
            success: true,
            alreadyClaimed: true,
            streak: currentStreak,
            balance: currentBalance
        });
        return;
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const newStreak = lastRewardDate === yesterday
        ? (currentStreak >= 7 ? 1 : currentStreak + 1)
        : 1;

    const reward = DAILY_REWARD_SCHEDULE[newStreak - 1];
    const newBalance = currentBalance + reward;

    await supabase
        .from("users")
        .update({
            balance: newBalance,
            login_streak: newStreak,
            last_reward_date: today
        })
        .eq("username", username);

    res.json({
        success: true,
        alreadyClaimed: false,
        reward: reward,
        streak: newStreak,
        balance: newBalance
    });
});

app.post("/api/friends/remove", requireAuth, async function (req, res) {
    const username = req.username;
    const friendUsername = req.body.friendUsername;

    if (!username || !friendUsername) {
        res.json({
            success: false,
            message: "Missing friend information."
        });
        return;
    }

    const pair = normalizeFriendPair(username, friendUsername);

    const result = await supabase
        .from("friends")
        .delete()
        .eq("user_one", pair.userOne)
        .eq("user_two", pair.userTwo);

    if (result.error) {
        console.log("REMOVE FRIEND ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not remove friend."
        });
        return;
    }

    res.json({
        success: true,
        message: "Friend removed."
    });
});
app.post("/api/friends/challenge", requireAuth, async function (req, res) {

    const challengerUsername = req.username;
    const receiverUsername = req.body.receiverUsername;
    const entryFee = Number(req.body.entryFee);

    if (!challengerUsername || !receiverUsername || !(entryFee > 0)) {
        res.json({
            success: false,
            message: "Missing challenge information."
        });
        return;
    }

    if (challengerUsername === receiverUsername) {
        res.json({
            success: false,
            message: "You cannot challenge yourself."
        });
        return;
    }

    const friendship = normalizeFriendPair(
        challengerUsername,
        receiverUsername
    );

    const friendResult = await supabase
        .from("friends")
        .select("*")
        .eq("user_one", friendship.userOne)
        .eq("user_two", friendship.userTwo)
        .maybeSingle();

    if (!friendResult.data) {
        res.json({
            success: false,
            message: "You can only challenge friends."
        });
        return;
    }

    const challenger = await supabase
        .from("users")
        .select("clash_tag, clash_friend_link")
        .eq("username", challengerUsername)
        .maybeSingle();

    const receiver = await supabase
        .from("users")
        .select("clash_tag, clash_friend_link")
        .eq("username", receiverUsername)
        .maybeSingle();

    const debit = await adjustBalance(challengerUsername, -entryFee);

    if (!debit.success) {
        res.json({
            success: false,
            message: "Not enough Vault Credits to send this challenge."
        });
        return;
    }

    const insertResult = await supabase
        .from("friend_challenges")
        .insert({
            challenger_username: challengerUsername,
            receiver_username: receiverUsername,
            game: "Clash Royale",
            entry_fee: entryFee,
            status: "pending",
            challenger_tag: challenger.data?.clash_tag,
            challenger_friend_link: challenger.data?.clash_friend_link,
            receiver_tag: receiver.data?.clash_tag,
            receiver_friend_link: receiver.data?.clash_friend_link
        })
        .select()
        .single();

    if (insertResult.error) {
        console.log(insertResult.error);

        await adjustBalance(challengerUsername, entryFee);

        res.json({
            success: false,
            message: "Could not send challenge."
        });

        return;
    }

    res.json({
        success: true,
        message: "Challenge sent!",
        challenge: insertResult.data
    });

});
app.get("/api/friends/challenges/:username", requireAuth, async function (req, res) {

    const username = req.params.username;

    if (req.username !== username) {
        res.status(403).json({
            success: false,
            message: "You cannot view another user's challenges."
        });
        return;
    }

    const result = await supabase
        .from("friend_challenges")
        .select("*")
        .eq("receiver_username", username)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (result.error) {
        console.log(result.error);

        res.json({
            success: false,
            challenges: []
        });

        return;
    }

    res.json({
        success: true,
        challenges: result.data || []
    });

});
app.get("/api/friends/challenge/:id", requireAuth, async function (req, res) {
    const challengeId = Number(req.params.id);

    const result = await supabase
        .from("friend_challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

    if (result.error || !result.data) {
        res.json({
            success: false,
            message: "Challenge not found."
        });
        return;
    }

    const challenge = result.data;

    if (
        req.username !== challenge.challenger_username &&
        req.username !== challenge.receiver_username
    ) {
        res.status(403).json({
            success: false,
            message: "You cannot view this challenge."
        });
        return;
    }

    const now = Date.now();
    const challengeAge = now - Number(challenge.created_at || 0);
    const fiveMinutes = 5 * 60 * 1000;

    if (challenge.status === "pending" && challengeAge > fiveMinutes) {
        const expiredResult = await supabase
            .from("friend_challenges")
            .update({
                status: "expired",
                updated_at: now
            })
            .eq("id", challengeId)
            .eq("status", "pending")
            .select()
            .single();

        if (!expiredResult.error && expiredResult.data) {
            await adjustBalance(
                expiredResult.data.challenger_username,
                Number(expiredResult.data.entry_fee) || 0
            );
        }

        res.json({
            success: true,
            challenge: expiredResult.data || challenge
        });

        return;
    }

    res.json({
        success: true,
        challenge: challenge
    });
});
app.post("/api/friends/challenge/:id/cancel", requireAuth, async function (req, res) {
    const challengeId = Number(req.params.id);
    const username = req.username;

    if (!username) {
        res.json({
            success: false,
            message: "Missing username."
        });
        return;
    }

    const challengeResult = await supabase
        .from("friend_challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

    if (!challengeResult.data) {
        res.json({
            success: false,
            message: "Challenge not found."
        });
        return;
    }

    const challenge = challengeResult.data;

    if (challenge.challenger_username !== username) {
        res.json({
            success: false,
            message: "You cannot cancel this challenge."
        });
        return;
    }

    if (challenge.status !== "pending") {
        res.json({
            success: false,
            message: "This challenge is no longer pending."
        });
        return;
    }

    const updateResult = await supabase
        .from("friend_challenges")
        .update({
            status: "cancelled",
            updated_at: Date.now()
        })
        .eq("id", challengeId)
        .eq("status", "pending")
        .select()
        .single();

    if (updateResult.error || !updateResult.data) {
        console.log("CANCEL CHALLENGE ERROR:", updateResult.error);

        res.json({
            success: false,
            message: "This challenge is no longer pending."
        });
        return;
    }

    await adjustBalance(username, Number(updateResult.data.entry_fee) || 0);

    res.json({
        success: true,
        message: "Challenge cancelled.",
        challenge: updateResult.data
    });
});
app.post("/api/friends/challenges/:id/accept", requireAuth, async function (req, res) {
    const challengeId = Number(req.params.id);
    const username = req.username;

    const challengeResult = await supabase
        .from("friend_challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

    if (!challengeResult.data) {
        res.json({ success: false, message: "Challenge not found." });
        return;
    }

    const challenge = challengeResult.data;

    if (challenge.receiver_username !== username) {
        res.json({ success: false, message: "You cannot accept this challenge." });
        return;
    }

    if (challenge.status !== "pending") {
        res.json({ success: false, message: "This challenge is no longer pending." });
        return;
    }

    const claimed = await supabase
        .from("friend_challenges")
        .update({
            status: "accepted",
            updated_at: Date.now()
        })
        .eq("id", challengeId)
        .eq("status", "pending")
        .select()
        .single();

    if (claimed.error || !claimed.data) {
        res.json({ success: false, message: "This challenge is no longer pending." });
        return;
    }

    const debit = await adjustBalance(username, -Number(challenge.entry_fee));

    if (!debit.success) {
        await supabase
            .from("friend_challenges")
            .update({ status: "pending", updated_at: Date.now() })
            .eq("id", challengeId);

        res.json({
            success: false,
            message: "Not enough Vault Credits to accept this challenge."
        });
        return;
    }

    const now = Date.now();

    const matchResult = await supabase
        .from("matches")
        .insert({
            game: "Clash Royale",
            mode: "Friend Challenge",
            entry_fee: challenge.entry_fee,

            creator_username: challenge.challenger_username,
            creator_tag: challenge.challenger_tag,
            creator_friend_link: challenge.challenger_friend_link,

            opponent_username: challenge.receiver_username,
            opponent_tag: challenge.receiver_tag,
            opponent_friend_link: challenge.receiver_friend_link,

            status: "Match ready",

            created_at: now,
            expires_at: null,
            verify_expires_at: now + 30 * 60 * 1000,

            winner_username: null,
            winner_tag: null,
            loser_username: null,
            loser_tag: null,
            verified_at: null
        })
        .select()
        .single();

    if (matchResult.error) {
        console.log("CREATE FRIEND MATCH ERROR:", matchResult.error);

        await adjustBalance(username, Number(challenge.entry_fee));

        await supabase
            .from("friend_challenges")
            .update({ status: "pending", updated_at: Date.now() })
            .eq("id", challengeId);

        res.json({
            success: false,
            message: "Could not create friend match."
        });
        return;
    }

    const updateResult = await supabase
        .from("friend_challenges")
        .update({
            match_id: matchResult.data.id,
            updated_at: Date.now()
        })
        .eq("id", challengeId)
        .select()
        .single();

    res.json({
        success: true,
        message: "Challenge accepted!",
        challenge: updateResult.data,
        match: dbMatchToFrontend(matchResult.data)
    });
});
app.post("/api/friends/challenges/:id/decline", requireAuth, async function (req, res) {

    const challengeId = Number(req.params.id);

    const challengeResult = await supabase
        .from("friend_challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

    if (!challengeResult.data) {
        res.json({
            success: false,
            message: "Challenge not found."
        });
        return;
    }

    if (challengeResult.data.receiver_username !== req.username) {
        res.status(403).json({
            success: false,
            message: "You cannot decline this challenge."
        });
        return;
    }

    const updateResult = await supabase
        .from("friend_challenges")
        .update({
            status: "declined",
            updated_at: Date.now()
        })
        .eq("id", challengeId)
        .eq("status", "pending")
        .select()
        .single();

    if (updateResult.error || !updateResult.data) {
        console.log(updateResult.error);

        res.json({
            success: false,
            message: "Could not decline challenge."
        });

        return;
    }

    await adjustBalance(
        updateResult.data.challenger_username,
        Number(updateResult.data.entry_fee) || 0
    );

    res.json({
        success: true,
        message: "Challenge declined."
    });

});
app.post("/api/friends/messages/send", requireAuth, async function (req, res) {
    const senderUsername = req.username;
    const receiverUsername = req.body.receiverUsername;
    const message = (req.body.message || "").trim();

    if (!senderUsername || !receiverUsername || !message) {
        res.json({
            success: false,
            message: "Missing message information."
        });
        return;
    }

    if (message.length > 500) {
        res.json({
            success: false,
            message: "Message is too long."
        });
        return;
    }

    const pair = normalizeFriendPair(senderUsername, receiverUsername);

    const friendResult = await supabase
        .from("friends")
        .select("*")
        .eq("user_one", pair.userOne)
        .eq("user_two", pair.userTwo)
        .maybeSingle();

    if (!friendResult.data) {
        res.json({
            success: false,
            message: "You can only message friends."
        });
        return;
    }

    const insertResult = await supabase
        .from("friend_messages")
        .insert({
            sender_username: senderUsername,
            receiver_username: receiverUsername,
            message: message,
            is_read: false,
            created_at: Date.now()
        })
        .select()
        .single();

    if (insertResult.error) {
        console.log("SEND MESSAGE ERROR:", insertResult.error);

        res.json({
            success: false,
            message: "Could not send message."
        });
        return;
    }

    res.json({
        success: true,
        message: "Message sent.",
        chatMessage: insertResult.data
    });
});

app.get("/api/friends/messages/:username/:friendUsername", requireAuth, async function (req, res) {
    const username = req.params.username;
    const friendUsername = req.params.friendUsername;

    if (req.username !== username) {
        res.status(403).json({
            success: false,
            message: "You cannot view another user's messages."
        });
        return;
    }

    const pair = normalizeFriendPair(username, friendUsername);

    const friendResult = await supabase
        .from("friends")
        .select("*")
        .eq("user_one", pair.userOne)
        .eq("user_two", pair.userTwo)
        .maybeSingle();

    if (!friendResult.data) {
        res.json({
            success: false,
            message: "You can only view chats with friends.",
            messages: []
        });
        return;
    }

    const result = await supabase
        .from("friend_messages")
        .select("*")
        .or(
            "and(sender_username.eq." + username + ",receiver_username.eq." + friendUsername + ")," +
            "and(sender_username.eq." + friendUsername + ",receiver_username.eq." + username + ")"
        )
        .order("created_at", { ascending: true })
        .limit(100);

    if (result.error) {
        console.log("LOAD MESSAGES ERROR:", result.error);

        res.json({
            success: false,
            message: "Could not load messages.",
            messages: []
        });
        return;
    }

    await supabase
        .from("friend_messages")
        .update({
            is_read: true
        })
        .eq("receiver_username", username)
        .eq("sender_username", friendUsername);

    res.json({
        success: true,
        messages: result.data || []
    });
});
app.get("/api/friends/unread/:username", requireAuth, async function (req, res) {

    const username = req.params.username;

    if (req.username !== username) {
        res.status(403).json({
            success: false,
            message: "You cannot view another user's unread messages."
        });
        return;
    }

    const result = await supabase
        .from("friend_messages")
        .select("sender_username")
        .eq("receiver_username", username)
        .eq("is_read", false);

    if (result.error) {

        console.log("UNREAD MESSAGE ERROR:", result.error);

        res.json({
            success: false,
            unread: {}
        });

        return;
    }

    const unread = {};

    for (const message of result.data || []) {

        unread[message.sender_username] =
            (unread[message.sender_username] || 0) + 1;

    }

    res.json({
        success: true,
        unread: unread
    });

});

async function loadDisputeMatch(matchType, matchId) {
    if (matchType === "match") {
        const result = await supabase
            .from("matches")
            .select("*")
            .eq("id", matchId)
            .maybeSingle();

        if (!result.data) return null;

        return {
            row: result.data,
            entryFee: Number(result.data.entry_fee) || 0,
            participants: [result.data.creator_username, result.data.opponent_username]
        };
    }

    if (matchType === "tournament_match") {
        const result = await supabase
            .from("tournament_matches")
            .select("*")
            .eq("id", matchId)
            .maybeSingle();

        if (!result.data) return null;

        const parentTournament = await supabase
            .from("tournaments")
            .select("entry_fee")
            .eq("id", result.data.tournament_id)
            .maybeSingle();

        return {
            row: result.data,
            entryFee: Number((parentTournament.data && parentTournament.data.entry_fee) || 0),
            participants: [result.data.player_one, result.data.player_two]
        };
    }

    return null;
}

app.post("/api/disputes", requireAuth, function (req, res, next) {
    evidenceUpload.array("evidence", 3)(req, res, function (err) {
        if (err) {
            res.json({
                success: false,
                message: err.message || "Could not upload evidence files."
            });
            return;
        }

        next();
    });
}, async function (req, res) {
    const matchType = req.body.matchType;
    const matchId = Number(req.body.matchId);
    const reason = (req.body.reason || "").trim();

    if (matchType !== "match" && matchType !== "tournament_match") {
        res.json({
            success: false,
            message: "Invalid match type."
        });
        return;
    }

    if (!matchId) {
        res.json({
            success: false,
            message: "Missing match id."
        });
        return;
    }

    if (reason.length < 10) {
        res.json({
            success: false,
            message: "Please explain your dispute in a bit more detail."
        });
        return;
    }

    const disputeMatch = await loadDisputeMatch(matchType, matchId);

    if (!disputeMatch) {
        res.json({
            success: false,
            message: "Match not found."
        });
        return;
    }

    if (!disputeMatch.participants.includes(req.username)) {
        res.status(403).json({
            success: false,
            message: "You were not a participant in this match."
        });
        return;
    }

    const evidencePaths = [];
    const files = req.files || [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = matchType + "-" + matchId + "-" + Date.now() + "-" + i + "-" + safeName;

        const uploadResult = await supabase.storage
            .from("dispute-evidence")
            .upload(path, file.buffer, { contentType: file.mimetype });

        if (uploadResult.error) {
            console.log("DISPUTE EVIDENCE UPLOAD ERROR:", uploadResult.error);
            continue;
        }

        evidencePaths.push(path);
    }

    const insertResult = await supabase
        .from("disputes")
        .insert({
            match_type: matchType,
            match_id: matchId,
            disputing_username: req.username,
            reason: reason,
            evidence_paths: evidencePaths,
            status: "pending",
            created_at: Date.now()
        })
        .select()
        .single();

    if (insertResult.error) {
        console.log("DISPUTE INSERT ERROR:", insertResult.error);

        res.json({
            success: false,
            message: "Could not submit dispute."
        });
        return;
    }

    res.json({
        success: true,
        message: "Dispute submitted. Our team will review it.",
        dispute: insertResult.data
    });
});

app.get("/api/disputes/mine", requireAuth, async function (req, res) {
    const result = await supabase
        .from("disputes")
        .select("*")
        .eq("disputing_username", req.username)
        .order("created_at", { ascending: false });

    res.json({
        success: true,
        disputes: result.data || []
    });
});

app.post("/api/admin/login", async function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    const foundUser = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (foundUser.error) {
        console.log("ADMIN LOGIN ERROR:", foundUser.error);
    }

    const storedPassword = foundUser.data ? foundUser.data.password : null;
    const isBcryptHash = typeof storedPassword === "string" && storedPassword.startsWith("$2");

    const passwordMatches = isBcryptHash
        ? storedPassword && (await bcrypt.compare(password, storedPassword))
        : storedPassword === password;

    if (!foundUser.data || !passwordMatches) {
        res.json({
            success: false,
            message: "Invalid email or password."
        });
        return;
    }

    if (!foundUser.data.is_admin) {
        res.status(403).json({
            success: false,
            message: "This account does not have admin access."
        });
        return;
    }

    res.json({
        success: true,
        message: "Admin sign-in successful.",
        token: signAdminSession(foundUser.data.username)
    });
});

app.get("/api/admin/disputes", requireAdminSession, async function (req, res) {
    const result = await supabase
        .from("disputes")
        .select("*")
        .order("status", { ascending: true })
        .order("created_at", { ascending: false });

    res.json({
        success: true,
        disputes: result.data || []
    });
});

app.get("/api/admin/disputes/:id", requireAdminSession, async function (req, res) {
    const disputeId = Number(req.params.id);

    const disputeResult = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId)
        .maybeSingle();

    if (!disputeResult.data) {
        res.json({
            success: false,
            message: "Dispute not found."
        });
        return;
    }

    const dispute = disputeResult.data;

    const disputeMatch = await loadDisputeMatch(dispute.match_type, dispute.match_id);

    const evidenceUrls = [];

    for (const path of dispute.evidence_paths || []) {
        const signed = await supabase.storage
            .from("dispute-evidence")
            .createSignedUrl(path, 300);

        if (!signed.error && signed.data) {
            evidenceUrls.push(signed.data.signedUrl);
        }
    }

    res.json({
        success: true,
        dispute: dispute,
        match: disputeMatch ? disputeMatch.row : null,
        entryFee: disputeMatch ? disputeMatch.entryFee : 0,
        evidenceUrls: evidenceUrls
    });
});

app.post("/api/admin/disputes/:id/resolve", requireAdminSession, async function (req, res) {
    const disputeId = Number(req.params.id);
    const action = req.body.action;
    const notes = req.body.notes || "";
    const manualUsername = req.body.manualUsername;
    const manualAmount = Number(req.body.manualAmount) || 0;

    const validActions = ["refund_both", "award_disputer", "dismiss", "manual"];

    if (!validActions.includes(action)) {
        res.json({
            success: false,
            message: "Invalid resolution action."
        });
        return;
    }

    const disputeResult = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId)
        .maybeSingle();

    if (!disputeResult.data) {
        res.json({
            success: false,
            message: "Dispute not found."
        });
        return;
    }

    const dispute = disputeResult.data;

    if (dispute.status === "resolved") {
        res.json({
            success: false,
            message: "This dispute has already been resolved."
        });
        return;
    }

    const disputeMatch = await loadDisputeMatch(dispute.match_type, dispute.match_id);

    if (action === "refund_both" || action === "award_disputer") {
        if (!disputeMatch) {
            res.json({
                success: false,
                message: "Could not load the underlying match to compute a refund amount."
            });
            return;
        }
    }

    if (action === "refund_both") {
        for (const participant of disputeMatch.participants) {
            if (participant) {
                await adjustBalance(participant, disputeMatch.entryFee);
            }
        }
    }

    if (action === "award_disputer") {
        await adjustBalance(dispute.disputing_username, disputeMatch.entryFee);
    }

    if (action === "manual") {
        if (!manualUsername || !manualAmount) {
            res.json({
                success: false,
                message: "Manual resolution requires a username and a non-zero amount."
            });
            return;
        }

        await adjustBalance(manualUsername, manualAmount);
    }

    await supabase
        .from("disputes")
        .update({
            status: "resolved",
            resolution_action: action,
            resolution_notes: notes,
            resolved_by: req.username,
            resolved_at: Date.now()
        })
        .eq("id", disputeId);

    await supabase
        .from("admin_actions")
        .insert({
            admin_username: req.username,
            action_type: "resolve_dispute",
            target_username: action === "manual" ? manualUsername : dispute.disputing_username,
            amount: action === "manual" ? manualAmount : (disputeMatch ? disputeMatch.entryFee : 0),
            dispute_id: disputeId,
            notes: notes,
            created_at: Date.now()
        });

    res.json({
        success: true,
        message: "Dispute resolved."
    });
});

app.get("/api/admin/users/search", requireAdminSession, async function (req, res) {
    const query = (req.query.q || "").trim();

    if (query.length < 2) {
        res.json({
            success: true,
            users: []
        });
        return;
    }

    const result = await supabase
        .from("users")
        .select("username, balance, level")
        .ilike("username", "%" + query + "%")
        .limit(10);

    res.json({
        success: true,
        users: result.data || []
    });
});

app.post("/api/admin/grant-currency", requireAdminSession, async function (req, res) {
    const targetUsername = req.body.username;
    const amount = Number(req.body.amount);

    if (!targetUsername || !amount) {
        res.json({
            success: false,
            message: "Username and a non-zero amount are required."
        });
        return;
    }

    const result = await adjustBalance(targetUsername, amount);

    if (!result.success) {
        res.json({
            success: false,
            message: result.message || "Could not adjust balance."
        });
        return;
    }

    await supabase
        .from("admin_actions")
        .insert({
            admin_username: req.username,
            action_type: "grant_currency",
            target_username: targetUsername,
            amount: amount,
            notes: req.body.notes || "",
            created_at: Date.now()
        });

    res.json({
        success: true,
        message: "Vault Credits sent.",
        balance: result.balance
    });
});

app.post("/api/admin/grant-xp", requireAdminSession, async function (req, res) {
    const targetUsername = req.body.username;
    const amount = Number(req.body.amount);

    if (!targetUsername || !amount) {
        res.json({
            success: false,
            message: "Username and a non-zero XP amount are required."
        });
        return;
    }

    const updatedUser = await awardXpToUser(targetUsername, amount);

    if (!updatedUser) {
        res.json({
            success: false,
            message: "Could not award XP."
        });
        return;
    }

    await supabase
        .from("admin_actions")
        .insert({
            admin_username: req.username,
            action_type: "grant_xp",
            target_username: targetUsername,
            amount: amount,
            notes: req.body.notes || "",
            created_at: Date.now()
        });

    res.json({
        success: true,
        message: "XP awarded.",
        user: updatedUser
    });
});

app.get("/api/admin/me", requireAdminSession, async function (req, res) {
    res.json({
        success: true,
        username: req.username
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

expireOldMatches();
expireStaleTournaments();
ensureSeasonZeroTournament();
setInterval(expireOldMatches, 60 * 1000);
setInterval(expireStaleTournaments, 60 * 1000);
setInterval(expireStaleClashLinks, 60 * 1000);
setInterval(expireStaleTournamentMatches, 60 * 1000);