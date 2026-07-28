"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReport = createReport;
exports.getOpenReports = getOpenReports;
exports.resolveReport = resolveReport;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
async function createReport(req, res) {
    try {
        const { postId, reason } = req.body;
        if (!postId || !reason) {
            return res.status(400).json({ error: "postId and reason are required" });
        }
        const post = await prismaClient_1.default.post.findUnique({ where: { id: postId } });
        if (!post)
            return res.status(404).json({ error: "Post not found" });
        const report = await prismaClient_1.default.report.create({
            data: { reporterId: req.userId, postId, reason },
        });
        logger_1.default.info("Post reported", { postId, reporterId: req.userId });
        res.status(201).json(report);
    }
    catch (error) {
        logger_1.default.error("Create report error", { error });
        res.status(500).json({ error: "Failed to submit report" });
    }
}
// Simple admin-facing view of open reports. In v1 this has no role check
// beyond auth — fine for a solo-dev demo, but flag clearly as a TODO
// before this ever has real users: this needs an isAdmin check.
async function getOpenReports(req, res) {
    try {
        const reports = await prismaClient_1.default.report.findMany({
            where: { status: "open" },
            include: { post: true },
            orderBy: { createdAt: "desc" },
        });
        res.json(reports);
    }
    catch (error) {
        logger_1.default.error("Get reports error", { error });
        res.status(500).json({ error: "Failed to fetch reports" });
    }
}
async function resolveReport(req, res) {
    try {
        const reportId = req.params.reportId;
        const { status } = req.body; // "reviewed" | "dismissed"
        const report = await prismaClient_1.default.report.update({
            where: { id: reportId },
            data: { status },
        });
        res.json(report);
    }
    catch (error) {
        logger_1.default.error("Resolve report error", { error });
        res.status(500).json({ error: "Failed to resolve report" });
    }
}
