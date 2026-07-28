"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.requireAuth);
// GET /api/users/me — returns the logged-in user's profile
router.get("/me", userController_1.getMe);
// PATCH /api/users/me/emergency-contact — saves an emergency contact
// shown automatically when a safety-flagged post is detected
router.patch("/me/emergency-contact", userController_1.updateEmergencyContact);
exports.default = router;
