import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../lib/logger";

export async function blockUser(req: AuthRequest, res: Response) {
  try {
    const { userId: blockedId } = req.body;
    if (!blockedId) return res.status(400).json({ error: "userId is required" });
    if (blockedId === req.userId) return res.status(400).json({ error: "Cannot block yourself" });

    const block = await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: req.userId!, blockedId } },
      update: {},
      create: { blockerId: req.userId!, blockedId },
    });

    res.status(201).json(block);
  } catch (error) {
    logger.error("Block user error", { error });
    res.status(500).json({ error: "Failed to block user" });
  }
}

export async function unblockUser(req: AuthRequest, res: Response) {
  try {
    const blockedId = req.params.userId as string;
    await prisma.userBlock.deleteMany({
      where: { blockerId: req.userId, blockedId },
    });
    res.status(204).send();
  } catch (error) {
    logger.error("Unblock user error", { error });
    res.status(500).json({ error: "Failed to unblock user" });
  }
}
