const path = require("node:path");

function loadEnvironment() {
  // Tests supply fixture credentials and must never read a real local key.
  if (process.env.NODE_ENV === "test") return;
  try {
    process.loadEnvFile(path.resolve(__dirname, "../.env.local"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error("Unable to load backend environment configuration");
    }
  }
}

module.exports = loadEnvironment;
