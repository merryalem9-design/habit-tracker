"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPost = createPost;
exports.reactToPost = reactToPost;
exports.editPost = editPost;
exports.deletePost = deletePost;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const socket_1 = require("../socket");
const safetyService_1 = require("../services/safetyService");
const crisisResources_1 = require("../lib/crisisResources");
const logger_1 = __importDefault(require("../lib/logger"));
const MAX_POST_LENGTH = 280;
const ALLOWED_REACTIONS = ["support", "strength", "solidarity", "proud"];
async function createPost(req, res) {
    try {
        const { groupId, checkInId, content } = req.body;
        const membership = await prismaClient_1.default.groupMembership.findFirst({
            where: { groupId, userId: req.userId, status: "active" },
        });
        if (!membership)
            return res.status(403).json({ error: "Not a member of this group" });
        if (content && content.length > MAX_POST_LENGTH) {
            return res.status(400).json({ error: `Posts are limited to ${MAX_POST_LENGTH} characters` });
        }
        const safetyResult = (0, safetyService_1.checkContent)(content ?? "");
        const post = await prismaClient_1.default.post.create({
            data: {
                groupId,
                checkInId: checkInId ?? null,
                userId: req.userId,
                content: content ?? null,
                flagged: safetyResult.flagged,
                flaggedReason: safetyResult.matchedCategory,
            },
        });
        let supportResponse = null;
        if (safetyResult.flagged) {
            await prismaClient_1.default.safetyEvent.create({
                data: {
                    postId: post.id,
                    keywordMatched: safetyResult.matchedCategory,
                    resourceShown: true,
                },
            });
            logger_1.default.info("Safety flag triggered", { postId: post.id, userId: req.userId, category: safetyResult.matchedCategory });
            const user = await prismaClient_1.default.user.findUnique({
                where: { id: req.userId },
                select: { emergencyContactName: true, emergencyContactPhone: true },
            });
            supportResponse = (0, crisisResources_1.buildSupportResponse)({
                name: user?.emergencyContactName ?? null,
                phone: user?.emergencyContactPhone ?? null,
            });
        }
        const shaped = {
            id: post.id,
            content: post.content,
            checkInId: post.checkInId,
            createdAt: post.createdAt,
            alias: membership.aliasInGroup,
            userId: post.userId,
            reactions: [],
        };
        (0, socket_1.getIO)().to(`group:${groupId}`).emit("new_post", shaped);
        res.status(201).json({
            post: shaped,
            supportResources: supportResponse,
        });
    }
    catch (error) {
        logger_1.default.error("Create post error", { error });
        res.status(500).json({ error: "Failed to create post" });
    }
}
async function reactToPost(req, res) {
    try {
        const postId = req.params.postId;
        const { reactionType } = req.body;
        if (!ALLOWED_REACTIONS.includes(reactionType)) {
            return res.status(400).json({ error: "Invalid reaction type" });
        }
        const post = await prismaClient_1.default.post.findUnique({ where: { id: postId } });
        if (!post)
            return res.status(404).json({ error: "Post not found" });
        const membership = await prismaClient_1.default.groupMembership.findFirst({
            where: { groupId: post.groupId, userId: req.userId, status: "active" },
        });
        if (!membership)
            return res.status(403).json({ error: "Not a member of this group" });
        const reaction = await prismaClient_1.default.reaction.upsert({
            where: { postId_userId: { postId, userId: req.userId } },
            update: { reactionType },
            create: { postId, userId: req.userId, reactionType },
        });
        (0, socket_1.getIO)().to(`group:${post.groupId}`).emit("new_reaction", { postId, reaction });
        res.status(201).json(reaction);
    }
    catch (error) {
        logger_1.default.error("React to post error", { error });
        res.status(500).json({ error: "Failed to add reaction" });
    }
}
async function editPost(req, res) {
    try {
        const postId = req.params.postId;
        const { content } = req.body;
        const post = await prismaClient_1.default.post.findUnique({ where: { id: postId } });
        if (!post || post.deleted)
            return res.status(404).json({ error: "Post not found" });
        if (post.userId !== req.userId)
            return res.status(403).json({ error: "Not your post" });
        // Re-run safety check on the edited content — a clean post could be edited into a flagged one
        const safetyResult = (0, safetyService_1.checkContent)(content);
        const updated = await prismaClient_1.default.post.update({
            where: { id: postId },
            data: {
                content,
                flagged: safetyResult.flagged,
                flaggedReason: safetyResult.matchedCategory,
            },
        });
        if (safetyResult.flagged) {
            await prismaClient_1.default.safetyEvent.create({
                data: {
                    postId: updated.id,
                    keywordMatched: safetyResult.matchedCategory,
                    resourceShown: true,
                },
            });
            logger_1.default.info("Safety flag triggered on edit", { postId: updated.id, userId: req.userId });
        }
        (0, socket_1.getIO)().to(`group:${post.groupId}`).emit("post_edited", { id: updated.id, content: updated.content });
        res.json({ id: updated.id, content: updated.content });
    }
    catch (error) {
        logger_1.default.error("Edit post error", { error });
        res.status(500).json({ error: "Failed to edit post" });
    }
}
async function deletePost(req, res) {
    try {
        const postId = req.params.postId;
        const post = await prismaClient_1.default.post.findUnique({ where: { id: postId } });
        if (!post || post.deleted)
            return res.status(404).json({ error: "Post not found" });
        if (post.userId !== req.userId)
            return res.status(403).json({ error: "Not your post" });
        // Soft delete — keeps row + any linked reports/safety events intact for moderation history
        await prismaClient_1.default.post.update({
            where: { id: postId },
            data: { deleted: true, content: null },
        });
        (0, socket_1.getIO)().to(`group:${post.groupId}`).emit("post_deleted", { id: postId });
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error("Delete post error", { error });
        res.status(500).json({ error: "Failed to delete post" });
    }
}
