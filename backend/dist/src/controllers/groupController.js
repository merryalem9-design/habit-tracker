"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.join = join;
exports.leave = leave;
exports.getMyGroups = getMyGroups;
exports.getFeed = getFeed;
exports.matchGroup = matchGroup;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const matchingService_1 = require("../services/matchingService");
const logger_1 = __importDefault(require("../lib/logger"));
async function join(req, res) {
    try {
        const { category, type } = req.body;
        const membership = await (0, matchingService_1.joinGroup)(req.userId, category, type);
        res.status(201).json(membership);
    }
    catch (error) {
        logger_1.default.error("Join group error", { error });
        res.status(500).json({ error: "Failed to join group" });
    }
}
async function leave(req, res) {
    try {
        const { groupId } = req.params;
        await (0, matchingService_1.leaveGroup)(req.userId, groupId);
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error("Leave group error", { error });
        res.status(500).json({ error: "Failed to leave group" });
    }
}
async function getMyGroups(req, res) {
    try {
        const memberships = await prismaClient_1.default.groupMembership.findMany({
            where: { userId: req.userId, status: "active" },
            include: { group: true },
        });
        res.json(memberships);
    }
    catch (error) {
        logger_1.default.error("Get my groups error", { error });
        res.status(500).json({ error: "Failed to fetch groups" });
    }
}
async function getFeed(req, res) {
    try {
        const groupId = req.params.groupId;
        const membership = await prismaClient_1.default.groupMembership.findFirst({
            where: { groupId, userId: req.userId, status: "active" },
        });
        if (!membership)
            return res.status(403).json({ error: "Not a member of this group" });
        const blocks = await prismaClient_1.default.userBlock.findMany({
            where: { blockerId: req.userId },
            select: { blockedId: true },
        });
        const blockedIds = new Set(blocks.map((b) => b.blockedId));
        const posts = await prismaClient_1.default.post.findMany({
            where: { groupId, flagged: false, deleted: false },
            include: {
                reactions: true,
                user: { select: { id: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        const membershipsInGroup = await prismaClient_1.default.groupMembership.findMany({
            where: { groupId, status: "active" },
        });
        const aliasMap = new Map(membershipsInGroup.map((m) => [m.userId, m.aliasInGroup]));
        const shaped = posts
            .filter((p) => !blockedIds.has(p.userId))
            .map((p) => ({
            id: p.id,
            content: p.content,
            checkInId: p.checkInId,
            createdAt: p.createdAt,
            alias: aliasMap.get(p.userId) ?? "Anonymous",
            userId: p.userId,
            reactions: p.reactions,
        }));
        res.json(shaped);
    }
    catch (error) {
        logger_1.default.error("Get feed error", { error });
        res.status(500).json({ error: "Failed to fetch feed" });
    }
}
// ─── NEW: Match group by category ────────────────────────────────
async function matchGroup(req, res) {
    try {
        const { category } = req.query;
        if (!category || typeof category !== "string") {
            return res.status(400).json({ error: "category is required" });
        }
        const group = await prismaClient_1.default.group.findFirst({
            where: { category, status: "active" },
        });
        res.json({ exists: !!group });
    }
    catch (error) {
        logger_1.default.error("Match group error", { error });
        res.status(500).json({ error: "Failed to check group" });
    }
}
