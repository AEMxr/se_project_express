const path = require("node:path");
const setupEnvironment = require("../utils/setupEnvironment");

setupEnvironment(path.resolve(__dirname, ".."));
console.warn(
  "Backend .env.local is ready. Keep it private and configure OPEN_WEATHER_API_KEY there if needed."
);
