import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getHabits, createHabit, updateHabit, archiveHabit } from "../controllers/habitController";
import { validate } from "../middleware/validate";
import { createHabitSchema, updateHabitSchema } from "../lib/validation";

const router = Router();
router.use(requireAuth);

router.get("/", getHabits);
router.post("/", validate(createHabitSchema), createHabit);
router.patch("/:id", validate(updateHabitSchema), updateHabit);
router.delete("/:id", archiveHabit);

export default router;