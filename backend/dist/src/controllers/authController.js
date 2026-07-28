"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto")); // ← added for reset tokens
const prismaClient_1 = __importDefault(require("../prismaClient"));
const generateAlias_1 = require("../utils/generateAlias");
const logger_1 = __importDefault(require("../lib/logger"));
const tokens_1 = require("../lib/tokens");
const emailService_1 = require("../services/emailService"); // ← new email service
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
async function issueTokenPair(userId) {
    const accessToken = (0, tokens_1.signAccessToken)(userId);
    const { raw, hash } = (0, tokens_1.generateRefreshToken)();
    await prismaClient_1.default.refreshToken.create({
        data: {
            userId,
            tokenHash: hash,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
    });
    return { accessToken, refreshToken: raw };
}
async function signup(req, res) {
    try {
        const { email, password, timezone } = req.body;
        const existingUser = await prismaClient_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: "An account with this email already exists" });
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const user = await prismaClient_1.default.user.create({
            data: {
                email,
                passwordHash,
                displayAlias: (0, generateAlias_1.generateAlias)(),
                avatarSeed: Math.random().toString(36).substring(2, 10),
                timezone: timezone || "UTC",
            },
        });
        logger_1.default.info("User created", { userId: user.id, email: user.email });
        const { accessToken, refreshToken } = await issueTokenPair(user.id);
        res.status(201).json({
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, displayAlias: user.displayAlias },
        });
    }
    catch (error) {
        logger_1.default.error("Signup error", { error });
        res.status(500).json({ error: "Something went wrong during signup" });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await prismaClient_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const passwordMatches = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!passwordMatches) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const { accessToken, refreshToken } = await issueTokenPair(user.id);
        res.json({
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, displayAlias: user.displayAlias },
        });
    }
    catch (error) {
        logger_1.default.error("Login error", { error });
        res.status(500).json({ error: "Something went wrong during login" });
    }
}
async function refresh(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "refreshToken is required" });
        }
        const hash = (0, tokens_1.hashRefreshToken)(refreshToken);
        const stored = await prismaClient_1.default.refreshToken.findFirst({ where: { tokenHash: hash } });
        if (!stored || stored.revoked || stored.expiresAt < new Date()) {
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }
        // rotate: revoke the old one, issue a new pair
        await prismaClient_1.default.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
        const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(stored.userId);
        res.json({ accessToken, refreshToken: newRefreshToken });
    }
    catch (error) {
        logger_1.default.error("Refresh error", { error });
        res.status(500).json({ error: "Failed to refresh token" });
    }
}
async function logout(req, res) {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "refreshToken is required" });
        }
        const hash = (0, tokens_1.hashRefreshToken)(refreshToken);
        await prismaClient_1.default.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error("Logout error", { error });
        res.status(500).json({ error: "Failed to logout" });
    }
}
// ───── NEW: Password Reset ──────────────────────────────────────────
async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;
        const user = await prismaClient_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const token = crypto_1.default.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await prismaClient_1.default.passwordResetToken.create({
            data: { userId: user.id, token, expiresAt },
        });
        await (0, emailService_1.sendResetCode)(email, token);
        res.json({ message: "Reset code sent to your email" });
    }
    catch (error) {
        logger_1.default.error("Reset request error", { error });
        res.status(500).json({ error: "Failed to send reset code" });
    }
}
async function resetPassword(req, res) {
    try {
        const { email, token, newPassword } = req.body;
        const user = await prismaClient_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const resetToken = await prismaClient_1.default.passwordResetToken.findFirst({
            where: {
                userId: user.id,
                token,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });
        if (!resetToken)
            return res.status(400).json({ error: "Invalid or expired token" });
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await prismaClient_1.default.$transaction([
            prismaClient_1.default.user.update({ where: { id: user.id }, data: { passwordHash: hashed } }),
            prismaClient_1.default.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
        ]);
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        logger_1.default.error("Reset password error", { error });
        res.status(500).json({ error: "Failed to reset password" });
    }
}
