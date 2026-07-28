"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHabits = getHabits;
exports.createHabit = createHabit;
exports.updateHabit = updateHabit;
exports.archiveHabit = archiveHabit;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
async function getHabits(req, res) {
    try {
        const habits = await prismaClient_1.default.habit.findMany({
            where: { userId: req.userId, isActive: true },
            include: { streak: true },
            orderBy: { createdAt: "desc" },
        });
        res.json(habits);
    }
    catch (error) {
        logger_1.default.error("Get habits error", { error });
        res.status(500).json({ error: "Failed to fetch habits" });
    }
}
async function createHabit(req, res) {
    try {
        const { title, category, targetFrequency } = req.body;
        if (!title || !category) {
            return res.status(400).json({ error: "Title and category are required" });
        }
        const habit = await prismaClient_1.default.habit.create({
            data: {
                userId: req.userId,
                title,
                category,
                targetFrequency: targetFrequency || "daily",
            },
        });
        logger_1.default.info("Habit created", { habitId: habit.id, userId: req.userId });
        await prismaClient_1.default.streak.create({
            data: { habitId: habit.id, currentStreak: 0, longestStreak: 0 },
        });
        res.status(201).json(habit);
    }
    catch (error) {
        logger_1.default.error("Signup error", { error });
        res.status(500).json({ error: "Failed to create habit" });
    }
}
async function updateHabit(req, res) {
    try {
        const id = req.params.id;
        const habit = await prismaClient_1.default.habit.findUnique({ where: { id } });
        if (!habit || habit.userId !== req.userId) {
            return res.status(404).json({ error: "Habit not found" });
        }
        const updated = await prismaClient_1.default.habit.update({
            where: { id },
            data: req.body,
        });
        res.json(updated);
    }
    catch (error) {
        logger_1.default.error("Update habit error", { error });
        res.status(500).json({ error: "Failed to update habit" });
    }
}
// Phase 3 called for this as a dedicated DELETE route — adding it now
async function archiveHabit(req, res) {
    try {
        const id = req.params.id;
        const habit = await prismaClient_1.default.habit.findUnique({ where: { id } });
        if (!habit || habit.userId !== req.userId) {
            return res.status(404).json({ error: "Habit not found" });
        }
        const archived = await prismaClient_1.default.habit.update({
            where: { id },
            data: { isActive: false },
        });
        res.json(archived);
    }
    catch (error) {
        logger_1.default.error("Archive habit error", { error });
        res.status(500).json({ error: "Failed to archive habit" });
    }
}
