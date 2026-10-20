const { rateLimit } = require("express-rate-limit");
const { TooManyRequestsError } = require("../utils/errors");

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_REQUEST_LIMIT = 20;

function createAuthLimiter({
  windowMs = AUTH_WINDOW_MS,
  limit = AUTH_REQUEST_LIMIT,
  skipSuccessfulRequests = false,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new TooManyRequestsError(
          "Too many authentication requests. Please try again later."
        )
      ),
  });
}

module.exports = { createAuthLimiter };
