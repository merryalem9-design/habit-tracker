import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import { getIO } from "../socket";
import { checkContent } from "../services/safetyService";
import { buildSupportResponse } from "../lib/crisisResources";
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

    const safetyResult = checkContent(content ?? "");

    const post = await prisma.post.create({
      data: {
        groupId,
        checkInId: checkInId ?? null,
        userId: req.userId!,
        content: content ?? null,
        flagged: safetyResult.flagged,
        flaggedReason: safetyResult.matchedCategory,
      },
    });

    let supportResponse = null;

    if (safetyResult.flagged) {
      await prisma.safetyEvent.create({
        data: {
          postId: post.id,
          keywordMatched: safetyResult.matchedCategory!,
          resourceShown: true,
        },
      });
      logger.info("Safety flag triggered", { postId: post.id, userId: req.userId, category: safetyResult.matchedCategory });

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { emergencyContactName: true, emergencyContactPhone: true },
      });

      supportResponse = buildSupportResponse({
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
  reactions: [] as unknown[],
};

    getIO().to(`group:${groupId}`).emit("new_post", shaped);

    res.status(201).json({
      post: shaped,
      supportResources: supportResponse,
    });
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
export async function editPost(req: AuthRequest, res: Response) {
  try {
    const postId = req.params.postId as string;
    const { content } = req.body;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deleted) return res.status(404).json({ error: "Post not found" });
    if (post.userId !== req.userId) return res.status(403).json({ error: "Not your post" });

    // Re-run safety check on the edited content — a clean post could be edited into a flagged one
    const safetyResult = checkContent(content);

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        flagged: safetyResult.flagged,
        flaggedReason: safetyResult.matchedCategory,
      },
    });

    if (safetyResult.flagged) {
      await prisma.safetyEvent.create({
        data: {
          postId: updated.id,
          keywordMatched: safetyResult.matchedCategory!,
          resourceShown: true,
        },
      });
      logger.info("Safety flag triggered on edit", { postId: updated.id, userId: req.userId });
    }

    getIO().to(`group:${post.groupId}`).emit("post_edited", { id: updated.id, content: updated.content });

    res.json({ id: updated.id, content: updated.content });
  } catch (error) {
    logger.error("Edit post error", { error });
    res.status(500).json({ error: "Failed to edit post" });
  }
}

export async function deletePost(req: AuthRequest, res: Response) {
  try {
    const postId = req.params.postId as string;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deleted) return res.status(404).json({ error: "Post not found" });
    if (post.userId !== req.userId) return res.status(403).json({ error: "Not your post" });

    // Soft delete — keeps row + any linked reports/safety events intact for moderation history
    await prisma.post.update({
      where: { id: postId },
      data: { deleted: true, content: null },
    });

    getIO().to(`group:${post.groupId}`).emit("post_deleted", { id: postId });

    res.status(204).send();
  } catch (error) {
    logger.error("Delete post error", { error });
    res.status(500).json({ error: "Failed to delete post" });
  }
}