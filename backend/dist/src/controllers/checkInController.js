"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckIn = createCheckIn;
exports.getCheckIns = getCheckIns;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const streakService_1 = require("../services/streakService");
const logger_1 = __importDefault(require("../lib/logger"));
async function createCheckIn(req, res) {
    try {
        const { habitId, status, note, mood } = req.body;
        if (!habitId || !status) {
            return res.status(400).json({ error: "habitId and status are required" });
        }
        const habit = await prismaClient_1.default.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== req.userId) {
            return res.status(404).json({ error: "Habit not found" });
        }
        const now = new Date();
        const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const checkIn = await prismaClient_1.default.checkIn.upsert({
            where: { habitId_date: { habitId, date: today } },
            update: { status, note, mood },
            create: { habitId, userId: req.userId, date: today, status, note, mood },
        });
        logger_1.default.info("Check-in logged", { habitId, userId: req.userId, status });
        const streak = await (0, streakService_1.recalculateStreak)(habitId);
        res.status(201).json({ checkIn, streak });
    }
    catch (error) {
        logger_1.default.error("Check-in error", { error });
        res.status(500).json({ error: "Failed to save check-in" });
    }
}
async function getCheckIns(req, res) {
    try {
        const habitId = req.params.habitId;
        const habit = await prismaClient_1.default.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== req.userId) {
            return res.status(404).json({ error: "Habit not found" });
        }
        const checkIns = await prismaClient_1.default.checkIn.findMany({
            where: { habitId },
            orderBy: { date: "asc" },
        });
        res.json(checkIns);
    }
    catch (error) {
        logger_1.default.error("Get check-ins error", { error });
        res.status(500).json({ error: "Failed to fetch check-ins" });
    }
}
