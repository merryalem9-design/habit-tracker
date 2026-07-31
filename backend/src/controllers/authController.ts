import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { differenceInCalendarDays } from "date-fns"; // <-- Added import
import prisma from "../prismaClient";
import { generateAlias } from "../utils/generateAlias";
import logger from "../lib/logger";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../lib/tokens";
import { recalculateStreak } from "../services/streakService"; // <-- Added import

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function issueTokenPair(userId: string) {
  const accessToken = signAccessToken(userId);
  const { raw, hash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
  });
  return { accessToken, refreshToken: raw };
}

async function generateUniqueVerificationCode(): Promise<string> {
  let code: string = ''; 
  let isUnique = false;
  while (!isUnique) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await prisma.user.findUnique({ where: { verificationCode: code } });
    if (!existing) isUnique = true;
  }
  return code;
}

// ─── NEW: Streak Check on Login ─────────────────────────────────────
async function checkAndBreakStreaks(userId: string): Promise<string[]> {
  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
    include: { streak: true },
  });

  const brokenHabits: string[] = [];
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  for (const habit of habits) {
    const streak = habit.streak;
    if (!streak || !streak.lastCheckinDate) continue;

    const lastDate = new Date(streak.lastCheckinDate);
    const daysGap = differenceInCalendarDays(today, lastDate);

    // If the gap is greater than 1 day, a day was missed.
    if (daysGap > 1) {
      // Insert a "skipped" check-in for the day after the last success
      // This acts as the "break point" for the streak calculator
      const breakDate = new Date(lastDate);
      breakDate.setDate(breakDate.getDate() + 1);

      // Only insert if the break date is in the past
      if (breakDate < today) {
        const existingSkip = await prisma.checkIn.findUnique({
          where: { habitId_date: { habitId: habit.id, date: breakDate } }
        });
        
        if (!existingSkip) {
          await prisma.checkIn.create({
            data: {
              habitId: habit.id,
              userId: userId,
              date: breakDate,
              status: "skipped"
            }
          });
        }
      }

      // Force recalculation of the streak (which will set it to 0)
      await recalculateStreak(habit.id);
      brokenHabits.push(habit.title);
    }
  }

  return brokenHabits;
}

// ─── END NEW STREAK LOGIC ──────────────────────────────────────────

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, timezone } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationCode = await generateUniqueVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayAlias: generateAlias(),
        avatarSeed: Math.random().toString(36).substring(2, 10),
        timezone: timezone || "UTC",
        isVerified: false,
        verificationCode,
        verificationCodeExpiresAt: expiresAt,
      },
    });
    logger.info("User created (unverified)", { userId: user.id, email: user.email });

    res.status(201).json({
      userId: user.id,
      message: "User created. Please verify your account.",
      verificationCode
    });
  } catch (error) {
    logger.error("Signup error", { error });
    res.status(500).json({ error: "Something went wrong during signup" });
  }
}

export async function sendVerificationCode(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.status(400).json({ error: "Account already verified" });

    const newCode = await generateUniqueVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: newCode, verificationCodeExpiresAt: expiresAt },
    });

    res.json({
      message: "New verification code sent to email.",
      verificationCode: newCode
    });
  } catch (error) {
    logger.error("Resend code error", { error });
    res.status(500).json({ error: "Failed to resend code" });
  }
}

export async function verifyAccount(req: Request, res: Response) {
  try {
    const { email, code } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.status(400).json({ error: "Account already verified" });

    if (user.verificationCode !== code) return res.status(400).json({ error: "Invalid verification code" });
    if (user.verificationCodeExpiresAt && user.verificationCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: "Verification code expired. Please request a new one." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationCode: null, verificationCodeExpiresAt: null },
    });

    const { accessToken, refreshToken } = await issueTokenPair(updatedUser.id);
    res.json({
      accessToken,
      refreshToken,
      user: { id: updatedUser.id, email: updatedUser.email, displayAlias: updatedUser.displayAlias, isVerified: true },
    });
  } catch (error) {
    logger.error("Verify account error", { error });
    res.status(500).json({ error: "Failed to verify account" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    if (!user.isVerified) {
      return res.status(403).json({ error: "Account not verified", code: "ACCOUNT_NOT_VERIFIED" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return res.status(401).json({ error: "Invalid email or password" });

    // ─── NEW: Check for broken streaks on this login ──────────────
    const brokenHabitNames = await checkAndBreakStreaks(user.id);
    // ──────────────────────────────────────────────────────────────

    const { accessToken, refreshToken } = await issueTokenPair(user.id);
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayAlias: user.displayAlias, isVerified: user.isVerified },
      // Return flags to the frontend so it can show the "Start Again" message
      streakBroken: brokenHabitNames.length > 0,
      brokenHabitNames
    });
  } catch (error) {
    logger.error("Login error", { error });
    res.status(500).json({ error: "Something went wrong during login" });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

    const hash = hashRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash: hash } });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(stored.userId);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error("Refresh error", { error });
    res.status(500).json({ error: "Failed to refresh token" });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

    const hash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
    res.status(204).send();
  } catch (error) {
    logger.error("Logout error", { error });
    res.status(500).json({ error: "Failed to logout" });
  }
}

// ───── PASSWORD RESET ──────────────────────────────────────────────

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    res.json({
      message: "Reset code generated. Please check the screen.",
      resetCode: token 
    });
  } catch (error) {
    logger.error("Reset request error", { error });
    res.status(500).json({ error: "Failed to send reset code" });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, token, newPassword } = req.body;
    
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, displayAlias: true, isVerified: true, passwordHash: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ error: "You can't use your old password again" });
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!resetToken) return res.status(400).json({ error: "Invalid or expired token" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashed } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    ]);

    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.json({
      message: "Password updated successfully",
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayAlias: user.displayAlias, isVerified: user.isVerified },
    });
  } catch (error) {
    logger.error("Reset password error", { error });
    res.status(500).json({ error: "Failed to reset password" });
  }
}