import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
  getConversations,
  getMessages,
  sendMessage,
  requestPair,
  getQueueStatus,
} from "../controllers/chatController";

const router = Router();
router.use(requireAuth);

router.get("/conversations", getConversations);
router.get("/:conversationId/messages", getMessages);
router.post("/message", sendMessage);
router.post("/pair", requestPair);
router.get("/pair/status", getQueueStatus);

export default router;