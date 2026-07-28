"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResetCode = sendResetCode;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
async function sendResetCode(email, code) {
    await transporter.sendMail({
        from: `"Habit Tracker" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset Code",
        html: `<p>Your password reset code is: <strong>${code}</strong></p><p>It expires in 15 minutes.</p>`,
    });
}
