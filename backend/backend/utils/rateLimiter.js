// middleware/rateLimiter.js
// Rate limiting middleware to prevent abuse

/**
 * Simple in-memory rate limiter
 * For production use, consider using Redis or another distributed solution
 */
const rateLimit = () => {
  const requestCounts = {};
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // limit each IP to 100 requests per windowMs

  // Clean up the requestCounts object every window period
  setInterval(() => {
    for (const ip in requestCounts) {
      delete requestCounts[ip];
    }
  }, windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    // Initialize request count for this IP
    if (!requestCounts[ip]) {
      requestCounts[ip] = {
        count: 1,
        resetTime: Date.now() + windowMs,
      };
    } else {
      requestCounts[ip].count += 1;
    }

    // Check if rate limit exceeded
    if (requestCounts[ip].count > maxRequests) {
      const resetTime = requestCounts[ip].resetTime;
      const currentTime = Date.now();
      const remainingTime = Math.ceil((resetTime - currentTime) / 1000 / 60); // in minutes

      return res.status(429).json({
        message: "Too many requests, please try again later",
        retryAfter: remainingTime + " minutes",
      });
    }

    next();
  };
};

module.exports = rateLimit;
