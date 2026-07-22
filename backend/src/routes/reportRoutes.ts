import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { createReport, getOpenReports, resolveReport } from "../controllers/reportController";
import { blockUser, unblockUser } from "../controllers/blockController";

const router = Router();
router.use(requireAuth);

router.post("/", createReport);
router.get("/open", getOpenReports); // TODO: restrict to admin before real users exist
router.patch("/:reportId", resolveReport);
router.post("/block", blockUser);
router.delete("/block/:userId", unblockUser);

export default router;
