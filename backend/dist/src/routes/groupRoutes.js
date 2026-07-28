"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const groupController_1 = require("../controllers/groupController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.requireAuth);
router.post("/join", groupController_1.join);
router.delete("/:groupId/leave", groupController_1.leave);
router.get("/mine", groupController_1.getMyGroups);
router.get("/:groupId/feed", groupController_1.getFeed);
router.get("/match", groupController_1.matchGroup); // ← ADD THIS LINE
exports.default = router;
