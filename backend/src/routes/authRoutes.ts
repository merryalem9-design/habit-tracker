import "dotenv/config";
import { Router } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  requestPasswordReset,   // ← added
  resetPassword,          // ← added
} from "../controllers/authController";
import { validate } from "../middleware/validate";
import { signupSchema, loginSchema } from "../lib/validation";
import { authRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/signup", authRateLimiter, validate(signupSchema), signup);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// ─── Password Reset Routes (new) ───
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

export default router;