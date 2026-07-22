import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import { joinGroup, leaveGroup } from "../services/matchingService";
import logger from "../lib/logger";

export async function join(req: AuthRequest, res: Response) {
  try {
    const { category, type } = req.body;
    const membership = await joinGroup(req.userId!, category, type);
    res.status(201).json(membership);
  } catch (error) {
    logger.error("Join group error", { error });
    res.status(500).json({ error: "Failed to join group" });
  }
}

export async function leave(req: AuthRequest, res: Response) {
  try {
    const { groupId } = req.params;
    await leaveGroup(req.userId!, groupId as string);
    res.status(204).send();
  } catch (error) {
    logger.error("Leave group error", { error });
    res.status(500).json({ error: "Failed to leave group" });
  }
}

export async function getMyGroups(req: AuthRequest, res: Response) {
  try {
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: req.userId, status: "active" },
      include: { group: true },
    });
    res.json(memberships);
  } catch (error) {
    logger.error("Get my groups error", { error });
    res.status(500).json({ error: "Failed to fetch groups" });
  }
}

export async function getFeed(req: AuthRequest, res: Response) {
  try {
    const groupId = req.params.groupId as string;

    const membership = await prisma.groupMembership.findFirst({
      where: { groupId, userId: req.userId, status: "active" },
    });
    if (!membership) return res.status(403).json({ error: "Not a member of this group" });

    // Get list of users this person has blocked, to filter them out
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: req.userId },
      select: { blockedId: true },
    });
    const blockedIds = new Set(blocks.map((b) => b.blockedId));

    const posts = await prisma.post.findMany({
      where: { groupId, flagged: false },
      include: {
        reactions: true,
        user: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const membershipsInGroup = await prisma.groupMembership.findMany({
      where: { groupId, status: "active" },
    });
    const aliasMap = new Map(membershipsInGroup.map((m) => [m.userId, m.aliasInGroup]));

    const shaped = posts
      .filter((p) => !blockedIds.has(p.userId)) // hide posts from blocked users
      .map((p) => ({
        id: p.id,
        content: p.content,
        checkInId: p.checkInId,
        createdAt: p.createdAt,
        alias: aliasMap.get(p.userId) ?? "Anonymous",
        reactions: p.reactions,
      }));

    res.json(shaped);
  } catch (error) {
    logger.error("Get feed error", { error });
    res.status(500).json({ error: "Failed to fetch feed" });
  }
}