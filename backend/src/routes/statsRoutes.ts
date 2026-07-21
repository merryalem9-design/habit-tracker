import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getHabitStats, getCheckInsByMonth, getHabitStreak, getDashboard } from "../controllers/statsController";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", getDashboard);
router.get("/habits/:habitId/stats", getHabitStats);
router.get("/habits/:habitId/checkins", getCheckInsByMonth);
router.get("/habits/:habitId/streak", getHabitStreak);

export default router;