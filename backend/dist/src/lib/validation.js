"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editPostSchema = exports.distractFeedbackSchema = exports.distractMeSchema = exports.createCheckInSchema = exports.updateHabitSchema = exports.createHabitSchema = exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    timezone: zod_1.z.string().optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.createHabitSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100),
    category: zod_1.z.string().min(1).max(50),
    targetFrequency: zod_1.z.string().optional(),
});
exports.updateHabitSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100).optional(),
    category: zod_1.z.string().min(1).max(50).optional(),
    targetFrequency: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.createCheckInSchema = zod_1.z.object({
    habitId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(["success", "relapse", "skipped"]),
    note: zod_1.z.string().max(1000).optional(),
    mood: zod_1.z.number().int().min(1).max(10).optional(),
});
exports.distractMeSchema = zod_1.z.object({
    type: zod_1.z.enum(["quote", "coffee", "ping_buddy", "support_group"]).optional().default("quote"),
    checkInId: zod_1.z.string().uuid().optional(),
    lat: zod_1.z.number().min(-90).max(90).optional(),
    lng: zod_1.z.number().min(-180).max(180).optional(),
});
exports.distractFeedbackSchema = zod_1.z.object({
    logId: zod_1.z.string().uuid(),
    helped: zod_1.z.boolean(),
});
exports.editPostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(280),
});
