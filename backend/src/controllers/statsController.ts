import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../lib/logger";

// GET /stats/dashboard - General summary stats for the authenticated user
export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId;

    const habits = await prisma.habit.findMany({
      where: { userId, isActive: true },
      include: { streak: true },
    });

    const activeHabitsCount = habits.length;
    let totalCurrentStreak = 0;
    let highestStreak = 0;

    habits.forEach((habit) => {
      const current = habit.streak?.currentStreak ?? 0;
      const longest = habit.streak?.longestStreak ?? 0;
      totalCurrentStreak += current;
      if (longest > highestStreak) {
        highestStreak = longest;
      }
    });

    const totalCheckIns = await prisma.checkIn.count({
      where: { userId },
    });

    res.json({
      activeHabitsCount,
      totalCurrentStreak,
      highestStreak,
      totalCheckIns,
    });
  } catch (error) {
    logger.error("Get dashboard stats error", { error });
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
}

// GET /habits/:habitId/stats
export async function getHabitStats(req: AuthRequest, res: Response) {
  try {
    const habitId = req.params.habitId as string;

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const checkIns = await prisma.checkIn.findMany({ where: { habitId } });
    const streak = await prisma.streak.findUnique({ where: { habitId } });

    const totalCheckIns = checkIns.length;
    const successCount = checkIns.filter((c) => c.status === "success").length;
    const successRate = totalCheckIns > 0 ? (successCount / totalCheckIns) * 100 : 0;

    res.json({
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalCheckIns,
      successCount,
      successRate: Math.round(successRate * 10) / 10,
    });
  } catch (error) {
    logger.error("Get habit stats error", { error });
    res.status(500).json({ error: "Failed to fetch habit stats" });
  }
}

// GET /habits/:habitId/checkins?month=YYYY-MM
export async function getCheckInsByMonth(req: AuthRequest, res: Response) {
  try {
    const habitId = req.params.habitId as string;
    const month = req.query.month as string; // "YYYY-MM"

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month query param must be in YYYY-MM format" });
    }

    const [year, monthNum] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, monthNum - 1, 1));
    const end = new Date(Date.UTC(year, monthNum, 1)); // first day of next month

    const checkIns = await prisma.checkIn.findMany({
      where: { habitId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });

    res.json(checkIns);
  } catch (error) {
    logger.error("Get check-ins by month error", { error });
    res.status(500).json({ error: "Failed to fetch check-ins" });
  }
}

// GET /habits/:habitId/streak
export async function getHabitStreak(req: AuthRequest, res: Response) {
  try {
    const habitId = req.params.habitId as string;

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const streak = await prisma.streak.findUnique({ where: { habitId } });

    res.json({
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastCheckinDate: streak?.lastCheckinDate ?? null,
    });
  } catch (error) {
    logger.error("Get habit streak error", { error });
    res.status(500).json({ error: "Failed to fetch habit streak" });
  }
}