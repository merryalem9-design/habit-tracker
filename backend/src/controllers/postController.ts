import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import { getIO } from "../socket";
import logger from "../lib/logger";

const MAX_POST_LENGTH = 280;
const ALLOWED_REACTIONS = ["support", "strength", "solidarity", "proud"];

export async function createPost(req: AuthRequest, res: Response) {
  try {
    const { groupId, checkInId, content } = req.body;

    const membership = await prisma.groupMembership.findFirst({
      where: { groupId, userId: req.userId, status: "active" },
    });
    if (!membership) return res.status(403).json({ error: "Not a member of this group" });

    if (content && content.length > MAX_POST_LENGTH) {
      return res.status(400).json({ error: `Posts are limited to ${MAX_POST_LENGTH} characters` });
    }

    const post = await prisma.post.create({
      data: { groupId, checkInId: checkInId ?? null, userId: req.userId!, content: content ?? null },
    });

    const shaped = {
      id: post.id,
      content: post.content,
      checkInId: post.checkInId,
      createdAt: post.createdAt,
      alias: membership.aliasInGroup,
      reactions: [],
    };

    getIO().to(`group:${groupId}`).emit("new_post", shaped);

    res.status(201).json(shaped);
  } catch (error) {
    logger.error("Create post error", { error });
    res.status(500).json({ error: "Failed to create post" });
  }
}

export async function reactToPost(req: AuthRequest, res: Response) {
  try {
    const postId = req.params.postId as string;
    const { reactionType } = req.body;

    if (!ALLOWED_REACTIONS.includes(reactionType)) {
      return res.status(400).json({ error: "Invalid reaction type" });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const membership = await prisma.groupMembership.findFirst({
      where: { groupId: post.groupId, userId: req.userId, status: "active" },
    });
    if (!membership) return res.status(403).json({ error: "Not a member of this group" });

    const reaction = await prisma.reaction.upsert({
      where: { postId_userId: { postId, userId: req.userId! } },
      update: { reactionType },
      create: { postId, userId: req.userId!, reactionType },
    });

    getIO().to(`group:${post.groupId}`).emit("new_reaction", { postId, reaction });

    res.status(201).json(reaction);
  } catch (error) {
    logger.error("React to post error", { error });
    res.status(500).json({ error: "Failed to add reaction" });
  }
}
