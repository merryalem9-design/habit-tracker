"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
let io;
function initSocket(httpServer, corsOptions) {
    io = new socket_io_1.Server(httpServer, {
        cors: corsOptions,
    });
    // ─── Authenticate every socket connection ──────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error("No token provided"));
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        }
        catch {
            next(new Error("Invalid token"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.userId;
        logger_1.default.info("Socket connected", { userId, socketId: socket.id });
        // ─── Join user to their personal room for direct notifications ──
        socket.join(`user:${userId}`);
        // ─── Group Feed Events ──────────────────────────────────────────
        socket.on("join_group", async (groupId) => {
            const membership = await prismaClient_1.default.groupMembership.findFirst({
                where: { groupId, userId, status: "active" },
            });
            if (!membership) {
                socket.emit("error", { message: "Not a member of this group" });
                return;
            }
            socket.join(`group:${groupId}`);
        });
        socket.on("leave_group", (groupId) => {
            socket.leave(`group:${groupId}`);
        });
        // ─── Chat Events ────────────────────────────────────────────────
        // Join a conversation room (for direct or group chat)
        socket.on("join_conversation", async (conversationId) => {
            // Verify membership
            const conv = await prismaClient_1.default.conversation.findUnique({
                where: { id: conversationId },
            });
            if (!conv) {
                socket.emit("error", { message: "Conversation not found" });
                return;
            }
            const isMember = conv.user1Id === userId ||
                conv.user2Id === userId ||
                (conv.groupId &&
                    (await prismaClient_1.default.groupMembership.findFirst({
                        where: { groupId: conv.groupId, userId },
                    })));
            if (!isMember) {
                socket.emit("error", { message: "Not a member of this conversation" });
                return;
            }
            socket.join(`conv:${conversationId}`);
            logger_1.default.info("User joined conversation", { userId, conversationId });
        });
        // Leave a conversation room
        socket.on("leave_conversation", (conversationId) => {
            socket.leave(`conv:${conversationId}`);
            logger_1.default.info("User left conversation", { userId, conversationId });
        });
        // Send a message in a conversation (includes notification to recipient)
        socket.on("send_message", async (data) => {
            try {
                const { conversationId, content } = data;
                if (!conversationId || !content?.trim()) {
                    socket.emit("error", { message: "conversationId and content are required" });
                    return;
                }
                // Verify user is a member
                const conv = await prismaClient_1.default.conversation.findUnique({
                    where: { id: conversationId },
                });
                if (!conv) {
                    socket.emit("error", { message: "Conversation not found" });
                    return;
                }
                const isMember = conv.user1Id === userId ||
                    conv.user2Id === userId ||
                    (conv.groupId &&
                        (await prismaClient_1.default.groupMembership.findFirst({
                            where: { groupId: conv.groupId, userId },
                        })));
                if (!isMember) {
                    socket.emit("error", { message: "Not authorized" });
                    return;
                }
                // Save message to database
                const msg = await prismaClient_1.default.chatMessage.create({
                    data: {
                        conversationId,
                        senderId: userId,
                        content: content.trim(),
                    },
                });
                // Update conversation timestamp
                await prismaClient_1.default.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                });
                // ─── Broadcast to conversation room ──────────────────────
                io.to(`conv:${conversationId}`).emit("new_message", msg);
                // ─── Send notification to the other participant ──────────
                // Determine recipient
                let recipientId = null;
                if (conv.type === "direct") {
                    recipientId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
                }
                else if (conv.groupId) {
                    // For group chats, we could notify all members, but we'll skip for now
                    // to avoid spam. We only handle direct chat notifications here.
                }
                if (recipientId) {
                    // Fetch sender's alias for the notification
                    const sender = await prismaClient_1.default.user.findUnique({
                        where: { id: userId },
                        select: { displayAlias: true },
                    });
                    io.to(`user:${recipientId}`).emit("new_message_notification", {
                        conversationId,
                        senderAlias: sender?.displayAlias || "Someone",
                        content: content.trim().length > 50
                            ? content.trim().slice(0, 50) + "..."
                            : content.trim(),
                        timestamp: msg.createdAt,
                    });
                }
            }
            catch (error) {
                logger_1.default.error("Socket send_message error", { error, userId });
                socket.emit("error", { message: "Failed to send message" });
            }
        });
        // ─── Typing indicator (optional) ──────────────────────────────
        socket.on("typing", (data) => {
            socket.to(`conv:${data.conversationId}`).emit("user_typing", {
                userId,
                isTyping: data.isTyping,
            });
        });
        // ─── Disconnect ──────────────────────────────────────────────────
        socket.on("disconnect", () => {
            logger_1.default.info("Socket disconnected", { userId, socketId: socket.id });
        });
    });
    return io;
}
function getIO() {
    if (!io)
        throw new Error("Socket.io not initialized");
    return io;
}
