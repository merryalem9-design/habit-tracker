import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "../prismaClient";
import logger from "../lib/logger";

let io: Server;

export function initSocket(httpServer: HTTPServer, corsOptions: { origin: string; credentials: boolean }) {
  io = new Server(httpServer, {
    cors: corsOptions,
  });

  // Authenticate socket connections using the same JWT as REST requests
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    logger.info("Socket connected", { userId, socketId: socket.id });

    // ─── Join user to their personal room for direct notifications ───
    socket.join(`user:${userId}`);

    // ─── Group Feed Events ─────────────────────────────────────────────

    // Client requests to join a specific group's live room
    socket.on("join_group", async (groupId: string) => {
      const membership = await prisma.groupMembership.findFirst({
        where: { groupId, userId, status: "active" },
      });
      if (!membership) {
        socket.emit("error", { message: "Not a member of this group" });
        return;
      }
      socket.join(`group:${groupId}`);
    });

    socket.on("leave_group", (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });

    // ─── Chat Events ──────────────────────────────────────────────────

    // Join a conversation room (for direct or group chat)
    socket.on("join_conversation", async (conversationId: string) => {
      // Verify the user is a member of this conversation
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conv) {
        socket.emit("error", { message: "Conversation not found" });
        return;
      }

      const isMember =
        conv.user1Id === userId ||
        conv.user2Id === userId ||
        (conv.groupId &&
          (await prisma.groupMembership.findFirst({
            where: { groupId: conv.groupId, userId },
          })));

      if (!isMember) {
        socket.emit("error", { message: "Not a member of this conversation" });
        return;
      }

      socket.join(`conv:${conversationId}`);
      logger.info("User joined conversation", { userId, conversationId });
    });

    // Leave a conversation room
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
      logger.info("User left conversation", { userId, conversationId });
    });

    // Send a message in a conversation
    socket.on("send_message", async (data: { conversationId: string; content: string }) => {
      try {
        const { conversationId, content } = data;

        if (!conversationId || !content?.trim()) {
          socket.emit("error", { message: "conversationId and content are required" });
          return;
        }

        // Verify user is a member
        const conv = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });
        if (!conv) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        const isMember =
          conv.user1Id === userId ||
          conv.user2Id === userId ||
          (conv.groupId &&
            (await prisma.groupMembership.findFirst({
              where: { groupId: conv.groupId, userId },
            })));

        if (!isMember) {
          socket.emit("error", { message: "Not authorized" });
          return;
        }

        // Save message to database
        const msg = await prisma.chatMessage.create({
          data: {
            conversationId,
            senderId: userId,
            content: content.trim(),
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Broadcast to everyone in the conversation room
        io.to(`conv:${conversationId}`).emit("new_message", msg);
      } catch (error) {
        logger.error("Send message error", { error, userId });
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ─── Typing indicator (optional) ────────────────────────────────

    socket.on("typing", (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conv:${data.conversationId}`).emit("user_typing", {
        userId,
        isTyping: data.isTyping,
      });
    });

    // ─── Disconnect ──────────────────────────────────────────────────

    socket.on("disconnect", () => {
      logger.info("Socket disconnected", { userId, socketId: socket.id });
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}