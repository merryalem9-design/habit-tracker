import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../lib/logger";

export async function createReport(req: AuthRequest, res: Response) {
  try {
    const { postId, reason } = req.body;
    if (!postId || !reason) {
      return res.status(400).json({ error: "postId and reason are required" });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const report = await prisma.report.create({
      data: { reporterId: req.userId!, postId, reason },
    });

    logger.info("Post reported", { postId, reporterId: req.userId });

    res.status(201).json(report);
  } catch (error) {
    logger.error("Create report error", { error });
    res.status(500).json({ error: "Failed to submit report" });
  }
}

// Simple admin-facing view of open reports. In v1 this has no role check
// beyond auth — fine for a solo-dev demo, but flag clearly as a TODO
// before this ever has real users: this needs an isAdmin check.
export async function getOpenReports(req: AuthRequest, res: Response) {
  try {
    const reports = await prisma.report.findMany({
      where: { status: "open" },
      include: { post: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (error) {
    logger.error("Get reports error", { error });
    res.status(500).json({ error: "Failed to fetch reports" });
  }
}

export async function resolveReport(req: AuthRequest, res: Response) {
  try {
    const reportId = req.params.reportId as string;
    const { status } = req.body; // "reviewed" | "dismissed"

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status },
    });

    res.json(report);
  } catch (error) {
    logger.error("Resolve report error", { error });
    res.status(500).json({ error: "Failed to resolve report" });
  }
}
