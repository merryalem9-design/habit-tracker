import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import { recalculateStreak } from "../services/streakService";
import logger from "../lib/logger";

export async function createCheckIn(req: AuthRequest, res: Response) {
  try {
    const { habitId, status, note, mood } = req.body;

    if (!habitId || !status) {
      return res.status(400).json({ error: "habitId and status are required" });
    }

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const checkIn = await prisma.checkIn.upsert({
      where: { habitId_date: { habitId, date: today } },
      update: { status, note, mood },
      create: { habitId, userId: req.userId!, date: today, status, note, mood },
    });
    logger.info("Check-in logged", { habitId, userId: req.userId, status });

    const streak = await recalculateStreak(habitId);

    res.status(201).json({ checkIn, streak });
  } catch (error) {
    logger.error("Check-in error", { error });
    res.status(500).json({ error: "Failed to save check-in" });
  }
}

export async function getCheckIns(req: AuthRequest, res: Response) {
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
    logger.error("Get check-ins error", { error });
    res.status(500).json({ error: "Failed to fetch check-ins" });
  }
}