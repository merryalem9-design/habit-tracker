"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const distractController_1 = require("../controllers/distractController");
const validate_1 = require("../middleware/validate");
const validation_1 = require("../lib/validation");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.requireAuth);
// Trigger a suggestion — called when user taps "Distract Me"
// or immediately after a safety-flagged post
router.post("/", (0, validate_1.validate)(validation_1.distractMeSchema), distractController_1.triggerDistractMe);
// Optional follow-up: did it help?
router.post("/feedback", (0, validate_1.validate)(validation_1.distractFeedbackSchema), distractController_1.submitFeedback);
// Personal usage stats
router.get("/stats", distractController_1.getDistractionStats);
exports.default = router;
