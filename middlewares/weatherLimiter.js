const { rateLimit } = require("express-rate-limit");
const { TooManyRequestsError } = require("../utils/errors");

function createWeatherLimiter({ windowMs = 60000, limit = 30 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new TooManyRequestsError(
          "Too many weather requests. Please try again later."
        )
      ),
  });
}

module.exports = { createWeatherLimiter };
