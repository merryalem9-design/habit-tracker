"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmergencyContact = updateEmergencyContact;
exports.getMe = getMe;
const prismaClient_1 = __importDefault(require("../prismaClient"));
const logger_1 = __importDefault(require("../lib/logger"));
async function updateEmergencyContact(req, res) {
    try {
        const { name, phone } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ error: "name and phone are required" });
        }
        const user = await prismaClient_1.default.user.update({
            where: { id: req.userId },
            data: { emergencyContactName: name, emergencyContactPhone: phone },
        });
        res.json({
            emergencyContactName: user.emergencyContactName,
            emergencyContactPhone: user.emergencyContactPhone,
        });
    }
    catch (error) {
        logger_1.default.error("Update emergency contact error", { error });
        res.status(500).json({ error: "Failed to update emergency contact" });
    }
}
async function getMe(req, res) {
    try {
        const user = await prismaClient_1.default.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                displayAlias: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
            },
        });
        res.json(user);
    }
    catch (error) {
        logger_1.default.error("Get me error", { error });
        res.status(500).json({ error: "Failed to fetch user" });
    }
}
