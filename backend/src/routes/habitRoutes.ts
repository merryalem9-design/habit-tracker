import { Router } from "express";
import prisma from "../prismaClient";
import { requireAuth, AuthRequest } from "../middleware/authMiddleware";

const router = Router();

// All habit routes require a logged-in user
router.use(requireAuth);

// GET /api/habits — list all of the logged-in user's habits, with streak info
router.get("/", async (req: AuthRequest, res) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, isActive: true },
      include: { streak: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(habits);
  } catch (error) {
    console.error("Get habits error:", error);
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

// POST /api/habits — create a new habit
router.post("/", async (req: AuthRequest, res) => {
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

    // Every habit gets a streak row from the start, initialized at 0
    await prisma.streak.create({
      data: { habitId: habit.id, currentStreak: 0, longestStreak: 0 },
    });

    res.status(201).json(habit);
  } catch (error) {
    console.error("Create habit error:", error);
    res.status(500).json({ error: "Failed to create habit" });
  }
});

// PATCH /api/habits/:id — edit or archive a habit
router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const id  = req.params.id as string;

    // Make sure this habit actually belongs to the logged-in user
    const habit = await prisma.habit.findUnique({ where: { id } });
    if (!habit || habit.userId !== req.userId) {
      return res.status(404).json({ error: "Habit not found" });
    }

    const updated = await prisma.habit.update({
      where: { id },
      data: req.body, // e.g. { title: "New name" } or { isActive: false } to archive
    });

    res.json(updated);
  } catch (error) {
    console.error("Update habit error:", error);
    res.status(500).json({ error: "Failed to update habit" });
  }
});

export default router;