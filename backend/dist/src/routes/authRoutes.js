"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validate_1 = require("../middleware/validate");
const validation_1 = require("../lib/validation");
const rateLimit_1 = require("../middleware/rateLimit");
const router = (0, express_1.Router)();
router.post("/signup", rateLimit_1.authRateLimiter, (0, validate_1.validate)(validation_1.signupSchema), authController_1.signup);
router.post("/login", rateLimit_1.authRateLimiter, (0, validate_1.validate)(validation_1.loginSchema), authController_1.login);
router.post("/refresh", authController_1.refresh);
router.post("/logout", authController_1.logout);
// ─── Password Reset Routes (new) ───
router.post("/request-reset", authController_1.requestPasswordReset);
router.post("/reset-password", authController_1.resetPassword);
exports.default = router;
