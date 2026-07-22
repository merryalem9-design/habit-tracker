import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getMe, updateEmergencyContact } from "../controllers/userController";

const router = Router();
router.use(requireAuth);

// GET /api/users/me — returns the logged-in user's profile
router.get("/me", getMe);

// PATCH /api/users/me/emergency-contact — saves an emergency contact
// shown automatically when a safety-flagged post is detected
router.patch("/me/emergency-contact", updateEmergencyContact);

export default router;