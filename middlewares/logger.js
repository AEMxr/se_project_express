const path = require("node:path");
const winston = require("winston");
const expressWinston = require("express-winston");
const { isCelebrateError } = require("celebrate");
const { normalizeError } = require("../utils/errors");

function defaultTransports(filename) {
  const transports = [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === "test",
      stderrLevels: ["error"],
    }),
  ];
  if (process.env.NODE_ENV !== "test") {
    transports.push(
      new winston.transports.File({
        filename: path.join(__dirname, "../logs", filename),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
        tailable: true,
      })
    );
  }
  return transports;
}

function errorMetadata(error) {
  const statusCode = isCelebrateError(error)
    ? 400
    : normalizeError(error).statusCode;
  return {
    errorName: error?.name || "Error",
    statusCode,
    // Error messages can contain passwords, invalid field values or database
    // details. Retain stack locations for server failures, without that text.
    stack:
      statusCode >= 500 && typeof error?.stack === "string"
        ? error.stack
            .split("\n")
            .filter((line) => /^\s+at /.test(line))
            .join("\n")
        : undefined,
  };
}

function createLoggers({ requestTransports, errorTransports } = {}) {
  const format = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );
  const requestLog = winston.createLogger({
    format,
    transports: requestTransports || defaultTransports("request.log"),
  });
  const errorLog = winston.createLogger({
    format,
    transports: errorTransports || defaultTransports("error.log"),
  });
  const safeRequest = {
    requestWhitelist: ["method"],
    dynamicMeta: (req) => ({ route: req.route?.path || "(unmatched)" }),
  };
  const requestLogger = expressWinston.logger({
    ...safeRequest,
    winstonInstance: requestLog,
    responseWhitelist: ["statusCode"],
    msg: "HTTP {{req.method}} {{res.statusCode}}",
  });
  const errorLogger = expressWinston.errorLogger({
    ...safeRequest,
    winstonInstance: errorLog,
    msg: "HTTP request failed",
    exceptionToMeta: errorMetadata,
  });
  return { requestLogger, errorLogger, requestLog, errorLog };
}

module.exports = { createLoggers };
