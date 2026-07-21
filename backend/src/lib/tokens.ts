import crypto from "crypto";
import jwt from "jsonwebtoken";

export function signAccessToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: "15m" });
}

export function generateRefreshToken() {
  const raw = crypto.randomBytes(40).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashRefreshToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}