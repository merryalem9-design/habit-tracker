import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../lib/logger";

export async function getConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const convs = await prisma.conversation.findMany({
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
    res.json(convs);
  } catch (error) {
    logger.error("Get conversations error", { error });
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
}

export async function getMessages(req: AuthRequest, res: Response) {
  try {
    const convId = req.params.conversationId as string;
    const userId = req.userId!;

    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const isMember =
      conv.user1Id === userId ||
      conv.user2Id === userId ||
      (conv.groupId &&
        (await prisma.groupMembership.findFirst({
          where: { groupId: conv.groupId, userId },
        })));

    if (!isMember) return res.status(403).json({ error: "Not authorized" });

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    res.json(messages);
  } catch (error) {
    logger.error("Get messages error", { error });
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}

export async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.userId!;

    if (!conversationId || !content) {
      return res.status(400).json({ error: "conversationId and content are required" });
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const msg = await prisma.chatMessage.create({
      data: { conversationId, senderId, content },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    res.status(201).json(msg);
  } catch (error) {
    logger.error("Send message error", { error });
    res.status(500).json({ error: "Failed to send message" });
  }
}

export async function requestPair(req: AuthRequest, res: Response) {
  try {
    const { category } = req.body;
    const userId = req.userId!;

    if (!category) {
      return res.status(400).json({ error: "category is required" });
    }

    const existing = await prisma.pairQueue.findFirst({ where: { userId } });
    if (existing) return res.status(400).json({ error: "Already in queue" });

    const match = await prisma.pairQueue.findFirst({
      where: { category, userId: { not: userId } },
      orderBy: { createdAt: "asc" },
    });

    if (match) {
      const conv = await prisma.conversation.create({
        data: {
          type: "direct",
          user1Id: userId,
          user2Id: match.userId,
        },
      });
      await prisma.pairQueue.delete({ where: { id: match.id } });

      // Emit match event via Socket.io (backend will handle later)
      return res.json({ matched: true, conversationId: conv.id });
    } else {
      await prisma.pairQueue.create({ data: { userId, category } });
      return res.json({ queued: true });
    }
  } catch (error) {
    logger.error("Pair request error", { error });
    res.status(500).json({ error: "Failed to request pair" });
  }
}

export async function getQueueStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const entry = await prisma.pairQueue.findFirst({ where: { userId } });
    if (!entry) return res.json({ inQueue: false });

    const count = await prisma.pairQueue.count({
      where: { category: entry.category, createdAt: { lt: entry.createdAt } },
    });
    res.json({ inQueue: true, position: count + 1, category: entry.category });
  } catch (error) {
    logger.error("Queue status error", { error });
    res.status(500).json({ error: "Failed to get queue status" });
  }
}