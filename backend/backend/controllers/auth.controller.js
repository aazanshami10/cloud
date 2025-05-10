// controllers/auth.controller.js
// Authentication controller

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
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const UserModel = getUserModel();

    // Check if user already exists
    let existingUser;

    if (config.database.type === "rds") {
      existingUser = await UserModel.findOne({ where: { email } });
    } else {
      existingUser = await UserModel.findByEmail(email);
    }

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    // Create user
    let newUser;

    if (config.database.type === "rds") {
      newUser = await UserModel.create({
        email,
        password,
        firstName,
        lastName,
      });

      // Remove password from response
      newUser = newUser.toJSON();
      delete newUser.password;
    } else {
      newUser = await UserModel.create({
        email,
        password,
        firstName,
        lastName,
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: newUser.id }, config.server.jwtSecret, {
      expiresIn: config.server.jwtExpiresIn,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const UserModel = getUserModel();

    let user;
    let isPasswordValid = false;

    if (config.database.type === "rds") {
      user = await UserModel.findOne({ where: { email } });

      if (user) {
        isPasswordValid = await user.validatePassword(password);
      }
    } else {
      user = await UserModel.validateCredentials(email, password);
      isPasswordValid = !!user;
    }

    if (!user || !isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Update last login
    if (config.database.type === "rds") {
      await user.update({ lastLogin: new Date() });

      // Remove password from response
      user = user.toJSON();
      delete user.password;
    } else {
      await UserModel.updateLastLogin(user.id);
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, config.server.jwtSecret, {
      expiresIn: config.server.jwtExpiresIn,
    });

    res.json({
      message: "Login successful",
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getProfile = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body;
    const updates = {};

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (password) updates.password = password;

    // Handle profile image from S3 upload
    if (req.body.profileImage) {
      updates.profileImage = req.body.profileImage;
    }

    const UserModel = getUserModel();
    let updatedUser;

    if (config.database.type === "rds") {
      await req.user.update(updates);
      updatedUser = await UserModel.findByPk(req.user.id);

      // Remove password from response
      updatedUser = updatedUser.toJSON();
      delete updatedUser.password;
    } else {
      updatedUser = await UserModel.update(req.user.id, updates);
    }

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
