import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
  triggerDistractMe,
  submitFeedback,
  getDistractionStats,
} from "../controllers/distractController";
import { validate } from "../middleware/validate";
import { distractMeSchema, distractFeedbackSchema } from "../lib/validation";

const router = Router();
router.use(requireAuth);

// Trigger a suggestion — called when user taps "Distract Me"
// or immediately after a safety-flagged post
router.post("/", validate(distractMeSchema), triggerDistractMe);

// Optional follow-up: did it help?
router.post("/feedback", validate(distractFeedbackSchema), submitFeedback);

// Personal usage stats
router.get("/stats", getDistractionStats);

export default router;