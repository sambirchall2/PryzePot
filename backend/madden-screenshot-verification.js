// Reads a Madden NFL final-score-screen screenshot with Claude vision and
// decides whether the two screenshots for a match_verification agree enough
// to auto-resolve, or need a human (needs_review).
//
// Deliberately standalone: this file only requires the Anthropic SDK and the
// Supabase client, never server.js - so readMaddenScoreScreen can be fed a
// stored image directly (see the bottom of this file) to test accuracy
// before trusting it in production, without booting the whole app.
//
// Background-job pattern: this codebase has no queue/cron/worker
// infrastructure - expireOldMatches() and friends are all either inline in
// request handlers or a setInterval loop inside server.js's own process.
// Consistent with that, runMaddenScreenshotVerification is triggered inline,
// synchronously, from the POST /api/matches/:id/screenshot handler the
// moment both screenshots exist - not queued. See chat.
// server.js already loads dotenv before requiring this module, but the
// standalone CLI mode at the bottom of this file runs `node
// madden-screenshot-verification.js` directly with nothing else in the
// require chain to load .env first - so load it here too. Safe to call
// twice; dotenv doesn't overwrite already-set vars.
require("dotenv").config();

const Anthropic = require("@anthropic-ai/sdk");
const supabase = require("./supabase");

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// Local, standalone equivalent of server.js's logMatchVerificationEvent -
// this file deliberately never requires server.js (see the file header), so
// it can't call that helper directly. Same table, same never-throws
// contract: audit logging must never take down a bot verification pass.
async function logEvent(matchVerificationId, eventType, options) {
    const opts = options || {};

    try {
        const insertResult = await supabase
            .from("match_verification_events")
            .insert({
                match_verification_id: matchVerificationId,
                event_type: eventType,
                actor_username: opts.actorUsername || null,
                winner_username: opts.winnerUsername || null,
                resolution_method: opts.resolutionMethod || null,
                details: opts.details || null,
                created_at: Date.now()
            });

        if (insertResult.error) {
            console.log("MATCH VERIFICATION EVENT INSERT ERROR:", matchVerificationId, eventType, insertResult.error);
        }
    } catch (error) {
        console.log("MATCH VERIFICATION EVENT ERROR:", matchVerificationId, eventType, error.message);
    }
}

const SCORE_SCREEN_SCHEMA = {
    type: "object",
    properties: {
        team_1: { type: "string" },
        score_1: { type: "integer" },
        team_2: { type: "string" },
        score_2: { type: "integer" },
        player_1: { type: "string" },
        player_2: { type: "string" },
        readable: { type: "boolean" },
        confidence: { type: "string", enum: ["high", "low"] },
        notes: { type: "string" }
    },
    required: [
        "team_1", "score_1", "team_2", "score_2",
        "player_1", "player_2",
        "readable", "confidence", "notes"
    ],
    additionalProperties: false
};

function buildPrompt(expectedTeam1, expectedTeam2, expectedPlayer1, expectedPlayer2) {
    return "This is a photo of the final score screen from a Madden NFL video game match.\n\n" +
        "The two players declared these teams before the match:\n" +
        "- Team A: \"" + expectedTeam1 + "\"\n" +
        "- Team B: \"" + expectedTeam2 + "\"\n\n" +
        "Read the score screen and report team_1/score_1 for one side and team_2/score_2 for the other, " +
        "in whatever left-to-right or top-to-bottom order they appear in the photo. " +
        "If you can confidently match what's shown to Team A and/or Team B, use their exact names above " +
        "(verbatim, not an abbreviation) for team_1/team_2 - this lets an automated check compare your reading " +
        "against the declared teams. If a team shown doesn't match either declared name, report the name as you " +
        "actually read it instead of guessing.\n\n" +
        "The two players' EA/gamertag names are:\n" +
        "- Player A: \"" + expectedPlayer1 + "\"\n" +
        "- Player B: \"" + expectedPlayer2 + "\"\n\n" +
        "These gamertags are usually shown near the bottom of the screen, often next to each team's sideline. " +
        "They are NOT guaranteed to be on the same side as that team's logo/score above - read whichever two " +
        "gamertags are actually shown and match them to Player A / Player B by the text itself, not by position. " +
        "Report them as player_1/player_2 (any order). Use the exact given name when you can confidently match " +
        "what's shown to Player A or Player B; otherwise report the gamertag as you actually read it.\n\n" +
        "Set readable=false if this isn't a legible final score screen at all. Set confidence=\"low\" if the image " +
        "is blurry, cropped, glared, partially obscured, or you are not fully sure of a team name, score, or " +
        "gamertag - explain why in notes. Set confidence=\"high\" only when both team names, both scores, and both " +
        "gamertags are clearly and unambiguously visible. Respond with the JSON object only.";
}

function guessMediaType(storagePath) {
    const lower = String(storagePath).toLowerCase();

    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";

    return "image/jpeg";
}

// Standalone, directly testable: feed it image bytes + the two declared
// teams and EA names, get the parsed JSON reading back. No database access.
async function readMaddenScoreScreen(imageBuffer, mediaType, expectedTeam1, expectedTeam2, expectedPlayer1, expectedPlayer2) {
    if (!anthropic) {
        throw new Error("ANTHROPIC_API_KEY is not set - cannot call the Claude API.");
    }

    const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        output_config: {
            effort: "medium",
            format: {
                type: "json_schema",
                schema: SCORE_SCREEN_SCHEMA
            }
        },
        messages: [{
            role: "user",
            content: [
                {
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: mediaType,
                        data: imageBuffer.toString("base64")
                    }
                },
                {
                    type: "text",
                    text: buildPrompt(expectedTeam1, expectedTeam2, expectedPlayer1, expectedPlayer2)
                }
            ]
        }]
    });

    const textBlock = response.content.find(function (block) { return block.type === "text"; });

    if (!textBlock) {
        throw new Error("Claude response had no text content.");
    }

    return JSON.parse(textBlock.text);
}

function normalizeForSetCompare(value) {
    return String(value || "").trim().toLowerCase();
}

// Order-independent: "are these two names, as a set, the same two names" -
// deliberately not positional, since gamertag placement at the bottom of
// the screen doesn't reliably line up with which team is on which side
// above (see chat).
function playerSetsMatch(readA, readB, expectedPlayer1, expectedPlayer2) {
    const expected = new Set([normalizeForSetCompare(expectedPlayer1), normalizeForSetCompare(expectedPlayer2)]);

    const actualA = new Set([normalizeForSetCompare(readA.player_1), normalizeForSetCompare(readA.player_2)]);
    const actualB = new Set([normalizeForSetCompare(readB.player_1), normalizeForSetCompare(readB.player_2)]);

    function setsEqual(a, b) {
        if (a.size !== b.size) return false;
        for (const value of a) {
            if (!b.has(value)) return false;
        }
        return true;
    }

    return setsEqual(actualA, expected) && setsEqual(actualB, expected);
}

// Pure decision logic, also independently testable: given the two parsed
// readings, the two declared teams, and the two declared EA names, decide
// whether they agree enough to auto-resolve. Returns { agree: true,
// winnerTeam } or { agree: false, reason, queueTag }.
function evaluateScreenshotPair(readingA, readingB, expectedTeam1, expectedTeam2, expectedPlayer1, expectedPlayer2) {
    if (!readingA.readable || !readingB.readable) {
        return { agree: false, queueTag: "needs_review", reason: "One or both screenshots were not readable." };
    }

    if (readingA.confidence !== "high" || readingB.confidence !== "high") {
        return { agree: false, queueTag: "needs_review", reason: "One or both screenshots were read with low confidence." };
    }

    const mapA = {};
    mapA[readingA.team_1] = readingA.score_1;
    mapA[readingA.team_2] = readingA.score_2;

    const mapB = {};
    mapB[readingB.team_1] = readingB.score_1;
    mapB[readingB.team_2] = readingB.score_2;

    const expectedTeams = [expectedTeam1, expectedTeam2];

    for (const team of expectedTeams) {
        if (!(team in mapA) || !(team in mapB)) {
            return { agree: false, queueTag: "needs_review", reason: "Extracted team names don't match the declared teams." };
        }

        if (mapA[team] !== mapB[team]) {
            return { agree: false, queueTag: "needs_review", reason: "The two screenshots report different scores." };
        }
    }

    if (mapA[expectedTeam1] === mapA[expectedTeam2]) {
        return { agree: false, queueTag: "needs_review", reason: "Screenshots agree, but the score is tied - no winner to auto-resolve." };
    }

    // Checked last, on purpose: a name mismatch is flagged as a dispute
    // (possible spoofed/mismatched screenshot) rather than a routine
    // needs_review, so it only fires once the score itself has already
    // checked out - no point escalating a blurry photo as a dispute.
    if (!playerSetsMatch(readingA, readingB, expectedPlayer1, expectedPlayer2)) {
        return {
            agree: false,
            queueTag: "dispute",
            reason: "Extracted gamertags (" + readingA.player_1 + " & " + readingA.player_2 + " / " +
                readingB.player_1 + " & " + readingB.player_2 + ") don't match the declared players (" +
                expectedPlayer1 + " & " + expectedPlayer2 + ")."
        };
    }

    const winnerTeam = mapA[expectedTeam1] > mapA[expectedTeam2] ? expectedTeam1 : expectedTeam2;

    return { agree: true, winnerTeam: winnerTeam };
}

// Full orchestration: fetch the match_verification's match + both
// screenshots, read each with Claude, record the raw extraction on
// match_screenshots regardless of outcome (admin reference - requirement
// 4), then either auto-resolve match_verifications or leave it in
// needs_review with the bot's notes attached.
//
// Does NOT complete the match itself (no payout/XP/balance calls) - that
// stays in server.js's completeMaddenMatch, the same helper the agreement
// path in POST /api/matches/:id/report-result already uses, so there is one
// place that ever moves money for a Madden match. Callers check
// result.resolved and invoke completeMaddenMatch themselves.
async function runMaddenScreenshotVerification(matchVerificationId) {
    const verificationResult = await supabase
        .from("match_verifications")
        .select("*")
        .eq("id", matchVerificationId)
        .maybeSingle();

    if (!verificationResult.data) {
        throw new Error("Match verification not found: " + matchVerificationId);
    }

    const verification = verificationResult.data;

    const matchResult = await supabase
        .from("matches")
        .select("*")
        .eq("id", verification.match_id)
        .maybeSingle();

    if (!matchResult.data) {
        throw new Error("Match not found for verification: " + matchVerificationId);
    }

    const match = matchResult.data;
    const expectedTeam1 = match.creator_team_selection;
    const expectedTeam2 = match.opponent_team_selection;
    // creator_tag/opponent_tag are the EA names snapshotted at
    // creation/join time (see server.js's formatPlayerHandle for Madden NFL).
    const expectedPlayer1 = match.creator_tag;
    const expectedPlayer2 = match.opponent_tag;

    const screenshotsResult = await supabase
        .from("match_screenshots")
        .select("*")
        .eq("match_verification_id", matchVerificationId);

    const screenshots = screenshotsResult.data || [];

    if (screenshots.length !== 2) {
        return { resolved: false, reason: "Expected 2 screenshots, found " + screenshots.length + "." };
    }

    const readings = [];

    for (const screenshot of screenshots) {
        const downloadResult = await supabase.storage
            .from("match-screenshots")
            .download(screenshot.storage_path);

        if (downloadResult.error || !downloadResult.data) {
            await supabase
                .from("match_screenshots")
                .update({ bot_read_status: "processed_error", bot_confidence_notes: "Could not download the stored image." })
                .eq("id", screenshot.id);

            readings.push({ screenshot: screenshot, reading: null });
            continue;
        }

        const imageBuffer = Buffer.from(await downloadResult.data.arrayBuffer());
        const mediaType = guessMediaType(screenshot.storage_path);

        let reading;
        let readStatus;

        try {
            reading = await readMaddenScoreScreen(imageBuffer, mediaType, expectedTeam1, expectedTeam2, expectedPlayer1, expectedPlayer2);
            readStatus = reading.confidence === "high" ? "processed_confident" : "processed_low_confidence";

            if (!reading.readable) readStatus = "processed_low_confidence";
        } catch (error) {
            console.log("MADDEN SCREENSHOT READ ERROR:", screenshot.id, error.message);

            reading = null;
            readStatus = "processed_error";
        }

        await supabase
            .from("match_screenshots")
            .update({
                bot_read_status: readStatus,
                bot_extracted_team_1: reading ? reading.team_1 : null,
                bot_extracted_score_1: reading ? reading.score_1 : null,
                bot_extracted_team_2: reading ? reading.team_2 : null,
                bot_extracted_score_2: reading ? reading.score_2 : null,
                bot_confidence_notes: reading ? reading.notes : "Reading the image with Claude failed."
            })
            .eq("id", screenshot.id);

        await logEvent(matchVerificationId, "bot_extraction", {
            details: screenshot.player_username + ": " + (reading
                ? reading.team_1 + " " + reading.score_1 + " - " + reading.team_2 + " " + reading.score_2 +
                  " (" + readStatus + ")" + (reading.notes ? " — " + reading.notes : "")
                : "Reading the image with Claude failed.")
        });

        readings.push({ screenshot: screenshot, reading: reading });
    }

    if (!readings[0].reading || !readings[1].reading) {
        await supabase
            .from("match_verifications")
            .update({ status: "needs_review", queue_tag: "needs_review" })
            .eq("id", matchVerificationId);

        return { resolved: false, reason: "One or both screenshots could not be read." };
    }

    const evaluation = evaluateScreenshotPair(
        readings[0].reading, readings[1].reading,
        expectedTeam1, expectedTeam2,
        expectedPlayer1, expectedPlayer2
    );

    if (!evaluation.agree) {
        await supabase
            .from("match_verifications")
            .update({ status: "needs_review", queue_tag: evaluation.queueTag })
            .eq("id", matchVerificationId);

        // Player-name mismatches (queueTag "dispute") don't have their own
        // DB column - fold the reason into each screenshot's existing notes
        // field so an admin can see why without a new migration.
        if (evaluation.queueTag === "dispute") {
            for (const entry of readings) {
                await supabase
                    .from("match_screenshots")
                    .update({ bot_confidence_notes: entry.reading.notes + " | " + evaluation.reason })
                    .eq("id", entry.screenshot.id);
            }
        }

        return { resolved: false, reason: evaluation.reason };
    }

    const winnerUsername = evaluation.winnerTeam === expectedTeam1 ? match.creator_username : match.opponent_username;

    await supabase
        .from("match_verifications")
        .update({
            status: "auto_resolved",
            resolution_method: "bot",
            winner_username: winnerUsername,
            resolved_at: Date.now()
        })
        .eq("id", matchVerificationId);

    await logEvent(matchVerificationId, "resolved", {
        winnerUsername: winnerUsername,
        resolutionMethod: "bot",
        details: "both screenshots agreed on " + evaluation.winnerTeam + " winning"
    });

    return { resolved: true, winnerUsername: winnerUsername, match: match };
}

module.exports = {
    readMaddenScoreScreen,
    evaluateScreenshotPair,
    runMaddenScreenshotVerification
};

// Standalone accuracy testing (requirement 5): run directly with Node,
// no server, no HTTP -
//   node madden-screenshot-verification.js path/to/screenshot.jpg "Dallas Cowboys" "Kansas City Chiefs" "player1gt" "player2gt"
if (require.main === module) {
    const fs = require("fs");
    const [, , imagePath, expectedTeam1, expectedTeam2, expectedPlayer1, expectedPlayer2] = process.argv;

    if (!imagePath || !expectedTeam1 || !expectedTeam2 || !expectedPlayer1 || !expectedPlayer2) {
        console.log(
            "Usage: node madden-screenshot-verification.js <image-path> " +
            "\"<expected team 1>\" \"<expected team 2>\" \"<expected player 1>\" \"<expected player 2>\""
        );
        process.exit(1);
    }

    const buffer = fs.readFileSync(imagePath);
    const mediaType = guessMediaType(imagePath);

    readMaddenScoreScreen(buffer, mediaType, expectedTeam1, expectedTeam2, expectedPlayer1, expectedPlayer2)
        .then(function (result) {
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(function (error) {
            console.error("ERROR:", error.message);
            process.exit(1);
        });
}
