import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { createCheckIn, getCheckIns } from "../controllers/checkInController";
import { validate } from "../middleware/validate";
import { createCheckInSchema } from "../lib/validation";

const router = Router();
router.use(requireAuth);

router.post("/", validate(createCheckInSchema), createCheckIn);
router.get("/:habitId", getCheckIns);

export default router;