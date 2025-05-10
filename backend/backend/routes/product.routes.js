// routes/product.routes.js
// Product routes

const express = require("express");
const productController = require("../controllers/product.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Public routes
router.get("/", productController.getAllProducts);
router.get("/:productId", productController.getProductById);
router.get("/category/:category", productController.getProductsByCategory);

// Protected routes
router.post(
  "/",
  authMiddleware.authenticate,
  authMiddleware.isActive,
  productController.createProduct
);

router.put(
  "/:productId",
  authMiddleware.authenticate,
  authMiddleware.isActive,
  productController.updateProduct
);

router.delete(
  "/:productId",
  authMiddleware.authenticate,
  authMiddleware.isActive,
  productController.deleteProduct
);

router.get(
  "/user/me",
  authMiddleware.authenticate,
  productController.getProductsByUser
);

module.exports = router;
