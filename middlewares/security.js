const cors = require("cors");
const helmet = require("helmet");
const { ForbiddenError } = require("../utils/errors");

const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://aemxr.github.io",
];

function normalizeOrigin(value) {
  try {
    const address = new URL(value);
    if (
      !["http:", "https:"].includes(address.protocol) ||
      address.username ||
      address.password ||
      address.search ||
      address.hash ||
      address.pathname !== "/"
    )
      throw new Error("Invalid origin");
    return address.origin;
  } catch {
    throw new Error(
      "CLIENT_ORIGINS must contain comma-separated HTTP(S) origins without credentials, paths, queries or fragments"
    );
  }
}

function createCors({ origins = process.env.CLIENT_ORIGINS } = {}) {
  const allowedOrigins = new Set(
    (origins ? origins.split(",") : DEFAULT_ORIGINS).map((origin) =>
      normalizeOrigin(origin.trim())
    )
  );
  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, false);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new ForbiddenError("This origin is not allowed."));
    },
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
}

function createSecurityHeaders({ environment = process.env.NODE_ENV } = {}) {
  const production = environment === "production";
  return helmet({
    strictTransportSecurity: production,
    contentSecurityPolicy: {
      directives: { "upgrade-insecure-requests": production ? [] : null },
    },
  });
}

module.exports = { createCors, createSecurityHeaders };
