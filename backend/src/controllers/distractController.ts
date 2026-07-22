import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import { getDistraction } from "../services/distractService";
import logger from "../lib/logger";

// POST /api/distract-me
// Body: { checkInId?, lat?, lng? }
export async function triggerDistractMe(req: AuthRequest, res: Response) {
  try {
    const { checkInId, lat, lng } = req.body;

    const result = await getDistraction(
      req.userId!,
      checkInId ?? null,
      typeof lat === "number" ? lat : undefined,
      typeof lng === "number" ? lng : undefined
    );

    res.status(201).json(result);
  } catch (error) {
    logger.error("Distract Me error", { error });
    res.status(500).json({ error: "Failed to get distraction suggestion" });
  }
}

// POST /api/distract-me/feedback
// Body: { logId, helped: boolean }
// Optional follow-up — lets the user self-report whether it helped.
// Feeds into their personal stats page.
export async function submitFeedback(req: AuthRequest, res: Response) {
  try {
    const { logId, helped } = req.body;

    if (!logId || typeof helped !== "boolean") {
      return res.status(400).json({ error: "logId and helped (boolean) are required" });
    }

    // Verify ownership — user can only update their own logs
    const log = await prisma.distractionLog.findUnique({ where: { id: logId } });
    if (!log || log.userId !== req.userId) {
      return res.status(404).json({ error: "Log not found" });
    }

    const updated = await prisma.distractionLog.update({
      where: { id: logId },
      data: { selfReportedHelp: helped },
    });

    res.json({ logId: updated.id, helped: updated.selfReportedHelp });
  } catch (error) {
    logger.error("Distract Me feedback error", { error });
    res.status(500).json({ error: "Failed to save feedback" });
  }
}

// GET /api/distract-me/stats
// Returns usage stats for the logged-in user — shown on their stats page.
export async function getDistractionStats(req: AuthRequest, res: Response) {
  try {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    const logs = await prisma.distractionLog.findMany({
      where: { userId: req.userId, triggeredAt: { gte: startOfMonth } },
    });

    const total = logs.length;
    const helped = logs.filter((l) => l.selfReportedHelp === true).length;
    const withFeedback = logs.filter((l) => l.selfReportedHelp !== null).length;
    const helpRate = withFeedback > 0
      ? Math.round((helped / withFeedback) * 100)
      : null;

    // Breakdown by suggestion type
    const byType = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.suggestionType] = (acc[l.suggestionType] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      thisMonth: { total, helpRate, byType },
    });
  } catch (error) {
    logger.error("Distract Me stats error", { error });
    res.status(500).json({ error: "Failed to fetch stats" });
  }
}