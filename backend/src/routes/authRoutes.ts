import "dotenv/config";
import { Router } from "express";
import { signup, login, refresh, logout } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { signupSchema, loginSchema } from "../lib/validation";
import { authRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.post("/signup", authRateLimiter, validate(signupSchema), signup);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;