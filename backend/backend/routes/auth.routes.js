// routes/auth.routes.js
// Authentication routes

const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Auth routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes
router.get("/profile", authMiddleware.authenticate, authController.getProfile);
router.put(
  "/profile",
  authMiddleware.authenticate,
  authController.updateProfile
);

module.exports = router;
