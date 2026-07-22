import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { createPost, reactToPost } from "../controllers/postController";

const router = Router();
router.use(requireAuth);

router.post("/", createPost);
router.post("/:postId/react", reactToPost);

export default router;
