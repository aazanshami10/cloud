// controllers/product.controller.js
// Product controller

const config = require("../config");
const dbInit = require("../db/init");

// Get appropriate model based on database type
const getProductModel = () => {
  if (config.database.type === "rds") {
    return dbInit.Product;
  } else {
    return require("../db/models/dynamodb/product.model");
  }
};

/**
 * Create a new product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    // Handle image URL from S3 upload
    const imageUrl = req.body.imageUrl || null;

    const ProductModel = getProductModel();
    let newProduct;

    if (config.database.type === "rds") {
      newProduct = await ProductModel.create({
        name,
        description,
        price,
        imageUrl,
        category,
        stock: stock || 0,
        userId: req.user.id,
      });
    } else {
      newProduct = await ProductModel.create(
        {
          name,
          description,
          price,
          imageUrl,
          category,
          stock: stock || 0,
        },
        req.user.id
      );
    }

    res.status(201).json({
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all products
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const lastKey = req.query.lastKey || null;

    const ProductModel = getProductModel();
    let products;
    let totalCount;
    let pagination = {};

    if (config.database.type === "rds") {
      const result = await ProductModel.findAndCountAll({
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      });

      products = result.rows;
      totalCount = result.count;

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);

      pagination = {
        totalItems: totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    } else {
      const result = await ProductModel.list(limit, lastKey);
      products = result.products;

      pagination = {
        lastEvaluatedKey: result.lastEvaluatedKey,
        hasMore: !!result.lastEvaluatedKey,
      };
    }

    res.json({
      products,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const ProductModel = getProductModel();
    let product;

    if (config.database.type === "rds") {
      product = await ProductModel.findByPk(productId);
    } else {
      product = await ProductModel.findById(productId);
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { name, description, price, category, stock, isActive } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (category !== undefined) updates.category = category;
    if (stock !== undefined) updates.stock = stock;
    if (isActive !== undefined) updates.isActive = isActive;

    // Handle image URL from S3 upload
    if (req.body.imageUrl !== undefined) {
      updates.imageUrl = req.body.imageUrl;
    }

    const ProductModel = getProductModel();
    let product;

    if (config.database.type === "rds") {
      product = await ProductModel.findByPk(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if the user owns the product
      if (product.userId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized to update this product" });
      }

      await product.update(updates);
    } else {
      try {
        product = await ProductModel.update(productId, updates, req.user.id);
      } catch (error) {
        if (error.message === "Product not found") {
          return res.status(404).json({ message: "Product not found" });
        }

        if (error.message === "Unauthorized to update this product") {
          return res
            .status(403)
            .json({ message: "Unauthorized to update this product" });
        }

        throw error;
      }
    }

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const ProductModel = getProductModel();

    if (config.database.type === "rds") {
      const product = await ProductModel.findByPk(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if the user owns the product
      if (product.userId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Unauthorized to delete this product" });
      }

      await product.destroy();
    } else {
      try {
        await ProductModel.delete(productId, req.user.id);
      } catch (error) {
        if (error.message === "Product not found") {
          return res.status(404).json({ message: "Product not found" });
        }

        if (error.message === "Unauthorized to delete this product") {
          return res
            .status(403)
            .json({ message: "Unauthorized to delete this product" });
        }

        throw error;
      }
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getProductsByUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const ProductModel = getProductModel();
    let products;

    if (config.database.type === "rds") {
      products = await ProductModel.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
      });
    } else {
      products = await ProductModel.findByUserId(userId);
    }

    res.json({ products });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const ProductModel = getProductModel();
    let products;

    if (config.database.type === "rds") {
      products = await ProductModel.findAll({
        where: { category },
        order: [["createdAt", "DESC"]],
      });
    } else {
      products = await ProductModel.findByCategory(category);
    }

    res.json({ products });
  } catch (error) {
    next(error);
  }
};
