// routes/upload.routes.js
// File upload routes

const express = require("express");
const uploadController = require("../controllers/upload.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// All upload routes are protected
router.use(authMiddleware.authenticate);
router.use(authMiddleware.isActive);

// Upload routes
router.post("/sign-url", uploadController.getSignedUploadUrl);
router.delete("/:fileName", uploadController.deleteFile);
router.get("/list/:folder?", uploadController.listFiles);

module.exports = router;
