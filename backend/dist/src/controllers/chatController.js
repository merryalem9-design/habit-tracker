"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversations = getConversations;
exports.getMessages = getMessages;
exports.sendMessage = sendMessage;
exports.requestPair = requestPair;
exports.getQueueStatus = getQueueStatus;
exports.markAsRead = markAsRead;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
const socket_1 = require("../socket");
// ─── Get all conversations for the logged‑in user ────────────────
async function getConversations(req, res) {
    try {
        const userId = req.userId;
        const convs = await prismaClient_1.default.conversation.findMany({
            where: {
                OR: [
                    { user1Id: userId },
                    { user2Id: userId },
                    { group: { memberships: { some: { userId, status: "active" } } } },
                ],
            },
            include: {
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
                group: true,
                user1: { select: { id: true, displayAlias: true } },
                user2: { select: { id: true, displayAlias: true } },
            },
            orderBy: { updatedAt: "desc" },
        });
        // Compute unread counts for each conversation
        const result = await Promise.all(convs.map(async (conv) => {
            let unreadCount = 0;
            let lastReadAt = null;
            if (conv.type === "direct") {
                if (conv.user1Id === userId) {
                    lastReadAt = conv.user1LastReadAt;
                }
                else if (conv.user2Id === userId) {
                    lastReadAt = conv.user2LastReadAt;
                }
                if (lastReadAt) {
                    unreadCount = await prismaClient_1.default.chatMessage.count({
                        where: {
                            conversationId: conv.id,
                            createdAt: { gt: lastReadAt },
                            senderId: { not: userId },
                        },
                    });
                }
            }
            return {
                ...conv,
                unreadCount,
            };
        }));
        res.json(result);
    }
    catch (error) {
        logger_1.default.error("Get conversations error", { error });
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
}
// ─── Get messages for a specific conversation ────────────────────
async function getMessages(req, res) {
    try {
        const convId = req.params.conversationId;
        const userId = req.userId;
        const conv = await prismaClient_1.default.conversation.findUnique({
            where: { id: convId },
        });
        if (!conv)
            return res.status(404).json({ error: "Conversation not found" });
        const isMember = conv.user1Id === userId ||
            conv.user2Id === userId ||
            (conv.groupId &&
                (await prismaClient_1.default.groupMembership.findFirst({
                    where: { groupId: conv.groupId, userId },
                })));
        if (!isMember)
            return res.status(403).json({ error: "Not authorized" });
        // Mark messages as read for this user
        const now = new Date();
        if (conv.type === "direct") {
            if (conv.user1Id === userId) {
                await prismaClient_1.default.conversation.update({
                    where: { id: convId },
                    data: { user1LastReadAt: now },
                });
            }
            else if (conv.user2Id === userId) {
                await prismaClient_1.default.conversation.update({
                    where: { id: convId },
                    data: { user2LastReadAt: now },
                });
            }
        }
        const messages = await prismaClient_1.default.chatMessage.findMany({
            where: { conversationId: convId },
            orderBy: { createdAt: "asc" },
            take: 100,
        });
        res.json(messages);
    }
    catch (error) {
        logger_1.default.error("Get messages error", { error });
        res.status(500).json({ error: "Failed to fetch messages" });
    }
}
// ─── Send a new message ───────────────────────────────────────────
async function sendMessage(req, res) {
    try {
        const { conversationId, content } = req.body;
        const senderId = req.userId;
        if (!conversationId || !content) {
            return res.status(400).json({ error: "conversationId and content are required" });
        }
        const conv = await prismaClient_1.default.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conv)
            return res.status(404).json({ error: "Conversation not found" });
        const msg = await prismaClient_1.default.chatMessage.create({
            data: { conversationId, senderId, content },
        });
        await prismaClient_1.default.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        const io = (0, socket_1.getIO)();
        io.to(`conv:${conversationId}`).emit("new_message", msg);
        // Send notification to the other participant with unread count
        if (conv.type === "direct") {
            const recipientId = conv.user1Id === senderId ? conv.user2Id : conv.user1Id;
            if (recipientId) {
                const lastReadAt = conv.user1Id === recipientId ? conv.user1LastReadAt : conv.user2LastReadAt;
                const unreadCount = await prismaClient_1.default.chatMessage.count({
                    where: {
                        conversationId: conv.id,
                        createdAt: { gt: lastReadAt },
                        senderId: { not: recipientId },
                    },
                });
                const sender = await prismaClient_1.default.user.findUnique({
                    where: { id: senderId },
                    select: { displayAlias: true },
                });
                io.to(`user:${recipientId}`).emit("new_message_notification", {
                    conversationId,
                    senderAlias: sender?.displayAlias || "Someone",
                    content: content.trim().length > 50 ? content.trim().slice(0, 50) + "..." : content.trim(),
                    timestamp: msg.createdAt,
                    unreadCount,
                });
            }
        }
        res.status(201).json(msg);
    }
    catch (error) {
        logger_1.default.error("Send message error", { error });
        res.status(500).json({ error: "Failed to send message" });
    }
}
// ─── Request 1‑on‑1 pairing ──────────────────────────────────────
async function requestPair(req, res) {
    try {
        const { category } = req.body;
        const userId = req.userId;
        if (!category) {
            return res.status(400).json({ error: "category is required" });
        }
        // Check if user already in queue for this category (case‑insensitive)
        const existing = await prismaClient_1.default.pairQueue.findFirst({
            where: {
                userId,
                category: { equals: category, mode: "insensitive" },
            },
        });
        if (existing) {
            const position = await prismaClient_1.default.pairQueue.count({
                where: {
                    category: existing.category,
                    createdAt: { lt: existing.createdAt },
                },
            });
            return res.status(409).json({
                error: "Already in queue for this category",
                inQueue: true,
                position: position + 1,
                category: existing.category,
            });
        }
        // Look for a match
        const match = await prismaClient_1.default.pairQueue.findFirst({
            where: {
                category: { equals: category, mode: "insensitive" },
                userId: { not: userId },
            },
            orderBy: { createdAt: "asc" },
        });
        if (match) {
            const conv = await prismaClient_1.default.conversation.create({
                data: {
                    type: "direct",
                    user1Id: userId,
                    user2Id: match.userId,
                },
            });
            await prismaClient_1.default.pairQueue.delete({ where: { id: match.id } });
            const io = (0, socket_1.getIO)();
            io.to(`user:${match.userId}`).emit("pair_matched", {
                conversationId: conv.id,
            });
            return res.json({ matched: true, conversationId: conv.id });
        }
        // No match – add to queue
        await prismaClient_1.default.pairQueue.create({ data: { userId, category } });
        return res.json({ queued: true });
    }
    catch (error) {
        logger_1.default.error("Pair request error", { error });
        res.status(500).json({ error: "Failed to request pair" });
    }
}
// ─── Get queue status ─────────────────────────────────────────────
async function getQueueStatus(req, res) {
    try {
        const userId = req.userId;
        const queues = await prismaClient_1.default.pairQueue.findMany({
            where: { userId },
            orderBy: { createdAt: "asc" },
        });
        const statuses = await Promise.all(queues.map(async (q) => {
            const position = await prismaClient_1.default.pairQueue.count({
                where: { category: q.category, createdAt: { lt: q.createdAt } },
            });
            return {
                category: q.category,
                position: position + 1,
                inQueue: true,
            };
        }));
        res.json(statuses);
    }
    catch (error) {
        logger_1.default.error("Queue status error", { error });
        res.status(500).json({ error: "Failed to get queue status" });
    }
}
// ─── Mark conversation as read ────────────────────────────────────
async function markAsRead(req, res) {
    try {
        const convId = req.params.conversationId;
        const userId = req.userId;
        const conv = await prismaClient_1.default.conversation.findUnique({
            where: { id: convId },
        });
        if (!conv)
            return res.status(404).json({ error: "Conversation not found" });
        const isMember = conv.user1Id === userId ||
            conv.user2Id === userId ||
            (conv.groupId &&
                (await prismaClient_1.default.groupMembership.findFirst({
                    where: { groupId: conv.groupId, userId },
                })));
        if (!isMember)
            return res.status(403).json({ error: "Not authorized" });
        const now = new Date();
        if (conv.type === "direct") {
            if (conv.user1Id === userId) {
                await prismaClient_1.default.conversation.update({
                    where: { id: convId },
                    data: { user1LastReadAt: now },
                });
            }
            else if (conv.user2Id === userId) {
                await prismaClient_1.default.conversation.update({
                    where: { id: convId },
                    data: { user2LastReadAt: now },
                });
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        logger_1.default.error("Mark as read error", { error });
        res.status(500).json({ error: "Failed to mark as read" });
    }
}
