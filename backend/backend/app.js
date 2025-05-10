// app.js
// Main application file

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { createServer } = require("http");
const config = require("./config");
const logger = require("./utils/logger");
const { globalErrorHandler } = require("./utils/errorHandler");

// Import routes
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const uploadRoutes = require("./routes/upload.routes");

// Create Express app
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('./middleware/rateLimiter')());

// Custom request logger
app.use((req, res, next) => {
  const oldSend = res.send;
  res.send = function (data) {
    logger.request(req, res);
    return oldSend.apply(res, arguments);
  };
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the AWS CRUD API",
    version: "1.0.0",
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.url} not found`,
  });
});

// Error handling middleware
app.use(globalErrorHandler);

// Start server
const PORT = config.server.port;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Initialize database connection
const dbInit = require("./db/init");
dbInit()
  .then(() => {
    logger.info("Database initialized successfully");
  })
  .catch((err) => {
    logger.error("Failed to initialize database", err);
    process.exit(1);
  });

// Handle uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! Shutting down...", err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
