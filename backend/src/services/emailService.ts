import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendResetCode(email: string, code: string) {
  await transporter.sendMail({
    from: `"Habit Tracker" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Code",
    html: `<p>Your password reset code is: <strong>${code}</strong></p><p>It expires in 15 minutes.</p>`,
  });
}