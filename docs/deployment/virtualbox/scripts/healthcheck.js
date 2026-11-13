const mongoose = require("mongoose");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const loadEnvironment = require("../../../../utils/loadEnvironment");

loadEnvironment();

const execFileAsync = promisify(execFile);
const API_URL = process.env.HEALTHCHECK_URL || "http://127.0.0.1:3001/";

async function checkApi() {
  const response = await fetch(API_URL, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data?.status !== "ok") {
    throw new Error("Unexpected API health response");
  }
}

async function checkMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  const address = new URL(uri);

  if (
    address.protocol !== "mongodb:" ||
    !["127.0.0.1", "localhost"].includes(address.hostname)
  ) {
    throw new Error("Expected a VM-local MongoDB connection");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    await mongoose.connection.db.admin().command({ ping: 1 });
  } finally {
    await mongoose.disconnect();
  }
}

async function checkPM2() {
  const { stdout } = await execFileAsync("pm2", ["jlist"], {
    timeout: 5000,
  });

  const processes = JSON.parse(stdout);

  const running = processes.some(
    (app) => app.name === "wtwr-vm-api" && app.pm2_env?.status === "online"
  );

  if (!running) {
    throw new Error("wtwr-vm-api is not online");
  }
}

async function main() {
  const checks = [
    ["Express", checkApi],
    ["MongoDB", checkMongoDB],
    ["PM2", checkPM2],
  ];

  let failures = 0;

  await checks.reduce(async (previousCheck, [name, check]) => {
    await previousCheck;

    try {
      await check();
      process.stdout.write(`[PASS] ${name}\n`);
    } catch (error) {
      failures += 1;
      console.error(`[FAIL] ${name}: ${error.message}`);
    }
  }, Promise.resolve());

  process.stdout.write(
    `Result: ${checks.length - failures}/${checks.length} checks passed\n`
  );

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Health checker failed:", error.message);
  process.exitCode = 1;
});
