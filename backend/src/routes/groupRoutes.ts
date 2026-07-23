import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { join, leave, getMyGroups, getFeed, matchGroup } from "../controllers/groupController";

const router = Router();
router.use(requireAuth);

router.post("/join", join);
router.delete("/:groupId/leave", leave);
router.get("/mine", getMyGroups);
router.get("/:groupId/feed", getFeed);
router.get("/match", matchGroup); // ← ADD THIS LINE

export default router;