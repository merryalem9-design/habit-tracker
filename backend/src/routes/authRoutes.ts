import "dotenv/config";
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prismaClient";
import { generateAlias } from "../utils/generateAlias";

const router = Router();

// POST /api/auth/signup — creates a new account
router.post("/signup", async (req, res) => {
  try {
    const { email, password, timezone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    // Hash the password — never store plain text. 10 = salt rounds, a solid default.
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

    // Log them in immediately after signup by issuing a token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });

    // Never send passwordHash back to the client
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, displayAlias: user.displayAlias },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Something went wrong during signup" });
  }
});

// POST /api/auth/login — verifies credentials and returns a token
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Same message for "no user" and "wrong password" — don't reveal which
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });

    res.json({
      token,
      user: { id: user.id, email: user.email, displayAlias: user.displayAlias },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Something went wrong during login" });
  }
});

export default router;