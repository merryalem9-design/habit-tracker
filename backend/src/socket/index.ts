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

    // Client requests to join a specific group's live room —
    // server verifies membership before allowing it
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
