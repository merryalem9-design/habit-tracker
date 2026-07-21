import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../prismaClient";
import { generateAlias } from "../utils/generateAlias";
import logger from "../lib/logger";
import { signAccessToken, generateRefreshToken, hashRefreshToken } from "../lib/tokens";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function issueTokenPair(userId: string) {
  const accessToken = signAccessToken(userId);
  const { raw, hash } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken: raw };
}

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, timezone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayAlias: generateAlias(),
        avatarSeed: Math.random().toString(36).substring(2, 10),
        timezone: timezone || "UTC",
      },
    });

    logger.info("User created", { userId: user.id, email: user.email });

    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayAlias: user.displayAlias },
    });
  } catch (error) {
    logger.error("Signup error", { error });
    res.status(500).json({ error: "Something went wrong during signup" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayAlias: user.displayAlias },
    });
  } catch (error) {
    logger.error("Login error", { error });
    res.status(500).json({ error: "Something went wrong during login" });
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    const hash = hashRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash: hash } });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // rotate: revoke the old one, issue a new pair
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
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    const hash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });

    res.status(204).send();
  } catch (error) {
    logger.error("Logout error", { error });
    res.status(500).json({ error: "Failed to logout" });
  }
}