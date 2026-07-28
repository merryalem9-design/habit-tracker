"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
async function blockUser(req, res) {
    try {
        const { userId: blockedId } = req.body;
        if (!blockedId)
            return res.status(400).json({ error: "userId is required" });
        if (blockedId === req.userId)
            return res.status(400).json({ error: "Cannot block yourself" });
        const block = await prismaClient_1.default.userBlock.upsert({
            where: { blockerId_blockedId: { blockerId: req.userId, blockedId } },
            update: {},
            create: { blockerId: req.userId, blockedId },
        });
        res.status(201).json(block);
    }
    catch (error) {
        logger_1.default.error("Block user error", { error });
        res.status(500).json({ error: "Failed to block user" });
    }
}
async function unblockUser(req, res) {
    try {
        const blockedId = req.params.userId;
        await prismaClient_1.default.userBlock.deleteMany({
            where: { blockerId: req.userId, blockedId },
        });
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error("Unblock user error", { error });
        res.status(500).json({ error: "Failed to unblock user" });
    }
}
