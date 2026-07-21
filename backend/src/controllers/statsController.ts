import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../lib/logger";

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
    const end = new Date(Date.UTC(year, monthNum, 1)); // first day of next month, exclusive

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
    res.json(streak);
  } catch (error) {
    logger.error("Get habit streak error", { error });
    res.status(500).json({ error: "Failed to fetch streak" });
  }
}

// GET /dashboard — aggregate across all of the user's habits
export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, isActive: true },
      include: { streak: true, checkIns: true },
    });

    const totalHabits = habits.length;

    let combinedCurrentStreak = 0;
    let combinedLongestStreak = 0;
    let mostConsistent: { title: string; successRate: number } | null = null;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let checkInsThisWeek = 0;

    for (const habit of habits) {
      combinedCurrentStreak += habit.streak?.currentStreak ?? 0;
      combinedLongestStreak += habit.streak?.longestStreak ?? 0;

      const total = habit.checkIns.length;
      const successes = habit.checkIns.filter((c) => c.status === "success").length;
      const rate = total > 0 ? (successes / total) * 100 : 0;

      if (!mostConsistent || rate > mostConsistent.successRate) {
        mostConsistent = { title: habit.title, successRate: Math.round(rate * 10) / 10 };
      }

      checkInsThisWeek += habit.checkIns.filter((c) => c.date >= oneWeekAgo).length;
    }

    res.json({
      totalHabits,
      combinedCurrentStreak,
      combinedLongestStreak,
      mostConsistentHabit: mostConsistent,
      checkInsThisWeek,
    });
  } catch (error) {
    logger.error("Get dashboard error", { error });
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
}