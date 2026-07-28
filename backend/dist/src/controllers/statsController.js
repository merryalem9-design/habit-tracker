"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = getDashboard;
exports.getHabitStats = getHabitStats;
exports.getCheckInsByMonth = getCheckInsByMonth;
exports.getHabitStreak = getHabitStreak;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
// GET /stats/dashboard - General summary stats for the authenticated user
async function getDashboard(req, res) {
    try {
        const userId = req.userId;
        const habits = await prismaClient_1.default.habit.findMany({
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
        const totalCheckIns = await prismaClient_1.default.checkIn.count({
            where: { userId },
        });
        res.json({
            activeHabitsCount,
            totalCurrentStreak,
            highestStreak,
            totalCheckIns,
        });
    }
    catch (error) {
        logger_1.default.error("Get dashboard stats error", { error });
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
}
// GET /habits/:habitId/stats
async function getHabitStats(req, res) {
    try {
        const habitId = req.params.habitId;
        const habit = await prismaClient_1.default.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== req.userId) {
            return res.status(404).json({ error: "Habit not found" });
        }
        const checkIns = await prismaClient_1.default.checkIn.findMany({ where: { habitId } });
        const streak = await prismaClient_1.default.streak.findUnique({ where: { habitId } });
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
    }
    catch (error) {
        logger_1.default.error("Get habit stats error", { error });
        res.status(500).json({ error: "Failed to fetch habit stats" });
    }
}
// GET /habits/:habitId/checkins?month=YYYY-MM
async function getCheckInsByMonth(req, res) {
    try {
        const habitId = req.params.habitId;
        const month = req.query.month; // "YYYY-MM"
        const habit = await prismaClient_1.default.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== req.userId) {
            return res.status(404).json({ error: "Habit not found" });
        }
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: "month query param must be in YYYY-MM format" });
        }
        const [year, monthNum] = month.split("-").map(Number);
        const start = new Date(Date.UTC(year, monthNum - 1, 1));
        const end = new Date(Date.UTC(year, monthNum, 1)); // first day of next month
        const checkIns = await prismaClient_1.default.checkIn.findMany({
            where: { habitId, date: { gte: start, lt: end } },
            orderBy: { date: "asc" },
        });
        res.json(checkIns);
    }
    catch (error) {
        logger_1.default.error("Get check-ins by month error", { error });
        res.status(500).json({ error: "Failed to fetch check-ins" });
    }
}
// GET /habits/:habitId/streak
async function getHabitStreak(req, res) {
    try {
        const habitId = req.params.habitId;
        const habit = await prismaClient_1.default.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== req.userId) {
            return res.status(404).json({ error: "Habit not found" });
        }
        const streak = await prismaClient_1.default.streak.findUnique({ where: { habitId } });
        res.json({
            currentStreak: streak?.currentStreak ?? 0,
            longestStreak: streak?.longestStreak ?? 0,
            lastCheckinDate: streak?.lastCheckinDate ?? null,
        });
    }
    catch (error) {
        logger_1.default.error("Get habit streak error", { error });
        res.status(500).json({ error: "Failed to fetch habit streak" });
    }
}
