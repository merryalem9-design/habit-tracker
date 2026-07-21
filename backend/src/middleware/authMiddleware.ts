import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extends Express's Request so TypeScript knows req.userId can exist
export interface AuthRequest extends Request {
  userId?: string;
}

// Protects routes that require a logged-in user.
// Checks for a valid JWT in the Authorization header; if valid,
// attaches the user's ID to the request for later route handlers to use.
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization; // expects "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}