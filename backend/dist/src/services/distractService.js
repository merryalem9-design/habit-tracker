"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDistraction = getDistraction;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
// ─── Internal mapping to SuggestionType enum ────────────────────
// The Prisma enum SuggestionType has: content, activity, nearby_place, ping_buddy
function mapToSuggestionType(type) {
    switch (type) {
        case "quote": return "content";
        case "coffee": return "nearby_place";
        case "ping_buddy": return "ping_buddy";
        case "support_group": return "ping_buddy"; // we reuse ping_buddy for group support
        default: return "content";
    }
}
// ─── Ping the user's 1‑on‑1 match or suggest emergency contact ──
async function pingDirectMatch(userId) {
    // Find if the user has any direct conversation
    const conv = await prismaClient_1.default.conversation.findFirst({
        where: {
            type: "direct",
            OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
            user1: { select: { displayAlias: true, emergencyContactName: true, emergencyContactPhone: true } },
            user2: { select: { displayAlias: true, emergencyContactName: true, emergencyContactPhone: true } },
        },
    });
    if (!conv) {
        // No match – check if user has emergency contact
        const user = await prismaClient_1.default.user.findUnique({
            where: { id: userId },
            select: { emergencyContactName: true, emergencyContactPhone: true },
        });
        if (user?.emergencyContactName && user?.emergencyContactPhone) {
            return {
                sent: false,
                matched: false,
                emergencyContact: { name: user.emergencyContactName, phone: user.emergencyContactPhone },
            };
        }
        return { sent: false, matched: false, emergencyContact: null };
    }
    const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
    // Send a message to the other user
    const msg = await prismaClient_1.default.chatMessage.create({
        data: {
            conversationId: conv.id,
            senderId: userId,
            content: "💙 I'm having a tough moment and could use some support. Are you available to chat?",
        },
    });
    await prismaClient_1.default.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
    });
    return {
        sent: true,
        matched: true,
        conversationId: conv.id,
        otherUser: otherUser?.displayAlias || "Your match",
        message: msg,
        emergencyContact: null,
    };
}
// ─── Send a support ping to the group ────────────────────────────
async function supportGroupPing(userId) {
    const membership = await prismaClient_1.default.groupMembership.findFirst({
        where: { userId, status: "active" },
        include: { group: true },
    });
    if (!membership)
        return { sent: false };
    await prismaClient_1.default.post.create({
        data: {
            groupId: membership.groupId,
            userId,
            content: `${membership.aliasInGroup} is going through a tough moment and would appreciate some encouragement. 💙`,
            flagged: false,
        },
    });
    return { sent: true, groupId: membership.groupId };
}
// ─── Get a random quote ───────────────────────────────────────────
async function getRandomQuote() {
    const items = await prismaClient_1.default.distractionContent.findMany({
        where: {
            type: { in: ["quote", "verse"] },
        },
    });
    if (items.length === 0)
        return null;
    return items[Math.floor(Math.random() * items.length)];
}
// ─── Find a nearby coffee shop ────────────────────────────────────
async function findNearbyCoffee(lat, lng) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        logger_1.default.warn("GOOGLE_PLACES_API_KEY not set");
        return null;
    }
    try {
        const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
        url.searchParams.set("location", `${lat},${lng}`);
        url.searchParams.set("radius", "3000");
        url.searchParams.set("type", "cafe");
        url.searchParams.set("key", apiKey);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (data.status !== "OK" || data.results.length === 0)
            return null;
        const place = data.results[Math.floor(Math.random() * Math.min(3, data.results.length))];
        return {
            name: place.name,
            address: place.vicinity,
            types: place.types?.slice(0, 3) || [],
        };
    }
    catch (err) {
        logger_1.default.error("Google Places API error", { err });
        return null;
    }
}
// ─── Main entry point ─────────────────────────────────────────────
async function getDistraction(userId, type, checkInId, lat, lng) {
    let result;
    let contentId = null;
    let dbSuggestionType = mapToSuggestionType(type); // for logging
    switch (type) {
        case "quote": {
            const item = await getRandomQuote();
            contentId = item?.id ?? null;
            result = { suggestionType: "quote", content: item ?? undefined };
            break;
        }
        case "coffee": {
            const place = lat && lng ? await findNearbyCoffee(lat, lng) : null;
            result = { suggestionType: "coffee", nearbyPlace: place };
            break;
        }
        case "ping_buddy": {
            const ping = await pingDirectMatch(userId);
            result = { suggestionType: "ping_buddy", pingBuddy: ping };
            break;
        }
        case "support_group": {
            const ping = await supportGroupPing(userId);
            result = { suggestionType: "support_group", supportGroup: ping };
            break;
        }
        default: {
            // Fallback to quote
            const item = await getRandomQuote();
            contentId = item?.id ?? null;
            result = { suggestionType: "quote", content: item ?? undefined };
            dbSuggestionType = "content";
        }
    }
    // Log the distraction – map to a valid SuggestionType enum value
    const log = await prismaClient_1.default.distractionLog.create({
        data: {
            userId,
            checkInId,
            suggestionType: dbSuggestionType, // ✅ now matches the enum
            contentId,
            triggeredAt: new Date(),
        },
    });
    return { ...result, logId: log.id };
}
