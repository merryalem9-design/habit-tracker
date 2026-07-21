import { Router } from "express";
import prisma from "../prismaClient";
import { requireAuth, AuthRequest } from "../middleware/authMiddleware";
import { recalculateStreak } from "../services/streakService";

const router = Router();
router.use(requireAuth);

// POST /api/checkins — log a check-in for a habit today
router.post("/", async (req: AuthRequest, res) => {
  try {
    const { habitId, status, note, mood } = req.body;
    // status must be "success" | "relapse" | "skipped"

    if (!habitId || !status) {
      return res.status(400).json({ error: "habitId and status are required" });
    }

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const now = new Date();
const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Prevent duplicate check-ins for the same day — update instead if one exists
    // Upsert: atomic create-or-update in one query — no race condition possible.
    // Requires a unique constraint on [habitId, date] in the schema.
    const checkIn = await prisma.checkIn.upsert({
      where: { habitId_date: { habitId, date: today } },
      update: { status, note, mood },
      create: { habitId, userId: req.userId!, date: today, status, note, mood },
    });

    // Recalculate streak immediately so the response reflects the new state
    const streak = await recalculateStreak(habitId);

    res.status(201).json({ checkIn, streak });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Failed to save check-in" });
  }
});

// GET /api/checkins/:habitId — full check-in history for a habit (for calendar/chart)
router.get("/:habitId", async (req: AuthRequest, res) => {
  try {
    const habitId = req.params.habitId as string;

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { habitId },
      orderBy: { date: "asc" },
    });

    res.json(checkIns);
  } catch (error) {
    console.error("Get check-ins error:", error);
    res.status(500).json({ error: "Failed to fetch check-ins" });
  }
});

export default router;