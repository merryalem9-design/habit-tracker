import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { createPost, reactToPost, editPost, deletePost } from "../controllers/postController";
import { validate } from "../middleware/validate";
import { editPostSchema } from "../lib/validation";

const router = Router();
router.use(requireAuth);

router.post("/", createPost);
router.post("/:postId/react", reactToPost);
router.patch("/:postId", validate(editPostSchema), editPost);
router.delete("/:postId", deletePost);

export default router;