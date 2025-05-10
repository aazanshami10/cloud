// middleware/auth.middleware.js
// Authentication and authorization middleware

const jwt = require("jsonwebtoken");
const config = require("../config");
const dbInit = require("../db/init");

// Get appropriate model based on database type
const getUserModel = () => {
  if (config.database.type === "rds") {
    return dbInit.User;
  } else {
    return require("../db/models/dynamodb/user.model");
  }
};

/**
 * Middleware to authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, config.server.jwtSecret);

    if (!decoded.id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get user from database
    const UserModel = getUserModel();
    let user;

    if (config.database.type === "rds") {
      user = await UserModel.findByPk(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Convert to plain object
      user = user.toJSON();

      // Remove password
      delete user.password;
    } else {
      user = await UserModel.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    next(error);
  }
};

/**
 * Middleware to check if user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin permission required" });
  }

  next();
};

/**
 * Middleware to check if user is active
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isActive = (req, res, next) => {
  if (!req.user || !req.user.isActive) {
    return res.status(403).json({ message: "Account is not active" });
  }

  next();
};
