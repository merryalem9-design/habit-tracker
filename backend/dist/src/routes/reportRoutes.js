"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const reportController_1 = require("../controllers/reportController");
const blockController_1 = require("../controllers/blockController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.requireAuth);
router.post("/", reportController_1.createReport);
router.get("/open", reportController_1.getOpenReports); // TODO: restrict to admin before real users exist
router.patch("/:reportId", reportController_1.resolveReport);
router.post("/block", blockController_1.blockUser);
router.delete("/block/:userId", blockController_1.unblockUser);
exports.default = router;
