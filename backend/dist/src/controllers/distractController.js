"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerDistractMe = triggerDistractMe;
exports.submitFeedback = submitFeedback;
exports.getDistractionStats = getDistractionStats;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const distractService_1 = require("../services/distractService");
const logger_1 = __importDefault(require("../lib/logger"));
// POST /api/distract-me
// Body: { type: "quote" | "coffee" | "ping_buddy" | "support_group", checkInId?, lat?, lng? }
async function triggerDistractMe(req, res) {
    try {
        const { type, checkInId, lat, lng } = req.body;
        // Validate the type
        const validTypes = ["quote", "coffee", "ping_buddy", "support_group"];
        const requestedType = validTypes.includes(type) ? type : "quote";
        const result = await (0, distractService_1.getDistraction)(req.userId, requestedType, checkInId ?? null, typeof lat === "number" ? lat : undefined, typeof lng === "number" ? lng : undefined);
        res.status(201).json(result);
    }
    catch (error) {
        logger_1.default.error("Distract Me error", { error });
        res.status(500).json({ error: "Failed to get distraction suggestion" });
    }
}
// POST /api/distract-me/feedback
async function submitFeedback(req, res) {
    try {
        const { logId, helped } = req.body;
        if (!logId || typeof helped !== "boolean") {
            return res.status(400).json({ error: "logId and helped (boolean) are required" });
        }
        const log = await prismaClient_1.default.distractionLog.findUnique({ where: { id: logId } });
        if (!log || log.userId !== req.userId) {
            return res.status(404).json({ error: "Log not found" });
        }
        const updated = await prismaClient_1.default.distractionLog.update({
            where: { id: logId },
            data: { selfReportedHelp: helped },
        });
        res.json({ logId: updated.id, helped: updated.selfReportedHelp });
    }
    catch (error) {
        logger_1.default.error("Distract Me feedback error", { error });
        res.status(500).json({ error: "Failed to save feedback" });
    }
}
// GET /api/distract-me/stats
async function getDistractionStats(req, res) {
    try {
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        const logs = await prismaClient_1.default.distractionLog.findMany({
            where: { userId: req.userId, triggeredAt: { gte: startOfMonth } },
        });
        const total = logs.length;
        const helped = logs.filter((l) => l.selfReportedHelp === true).length;
        const withFeedback = logs.filter((l) => l.selfReportedHelp !== null).length;
        const helpRate = withFeedback > 0 ? Math.round((helped / withFeedback) * 100) : null;
        const byType = logs.reduce((acc, l) => {
            acc[l.suggestionType] = (acc[l.suggestionType] ?? 0) + 1;
            return acc;
        }, {});
        res.json({
            thisMonth: { total, helpRate, byType },
        });
    }
    catch (error) {
        logger_1.default.error("Distract Me stats error", { error });
        res.status(500).json({ error: "Failed to fetch stats" });
    }
}
