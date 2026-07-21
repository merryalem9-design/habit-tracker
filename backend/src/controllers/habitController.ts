import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../lib/logger";

export async function getHabits(req: AuthRequest, res: Response) {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, isActive: true },
      include: { streak: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(habits);
  } catch (error) {
    logger.error("Get habits error", { error });
    res.status(500).json({ error: "Failed to fetch habits" });
  }
}

export async function createHabit(req: AuthRequest, res: Response) {
  try {
    const { title, category, targetFrequency } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: "Title and category are required" });
    }

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId!,
        title,
        category,
        targetFrequency: targetFrequency || "daily",
      },
    });
    logger.info("Habit created", { habitId: habit.id, userId: req.userId });

    await prisma.streak.create({
      data: { habitId: habit.id, currentStreak: 0, longestStreak: 0 },
    });

    res.status(201).json(habit);
  } catch (error) {
    logger.error("Signup error", { error });
    res.status(500).json({ error: "Failed to create habit" });
  }
}

export async function updateHabit(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;

    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const updated = await prisma.habit.update({
      where: { id },
      data: req.body,
    });

    res.json(updated);
  } catch (error) {
    logger.error("Update habit error", { error });
    res.status(500).json({ error: "Failed to update habit" });
  }
}

// Phase 3 called for this as a dedicated DELETE route — adding it now
export async function archiveHabit(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;

    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const archived = await prisma.habit.update({
      where: { id },
      data: { isActive: false },
    });

    res.json(archived);
  } catch (error) {
    logger.error("Archive habit error", { error });
    res.status(500).json({ error: "Failed to archive habit" });
  }
}