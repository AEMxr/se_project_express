const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server-core");
const User = require("../../models/user");
const ClothingItem = require("../../models/clothingItem");
const { JWT_SECRET } = require("../../utils/config");

function findLocalBinary() {
  const executable = process.platform === "win32" ? "mongod.exe" : "mongod";
  const candidates = process.env.MONGOMS_SYSTEM_BINARY
    ? [process.env.MONGOMS_SYSTEM_BINARY]
    : (process.env.PATH || "")
        .split(path.delimiter)
        .map((entry) => path.join(entry, executable));
  if (process.platform === "win32" && !process.env.MONGOMS_SYSTEM_BINARY) {
    const directory = path.join(
      process.env.ProgramFiles || "C:/Program Files",
      "MongoDB",
      "Server"
    );
    if (fs.existsSync(directory)) {
      fs.readdirSync(directory)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        .forEach((version) =>
          candidates.push(path.join(directory, version, "bin", executable))
        );
    }
  }
  const systemBinary = candidates.find((candidate) => fs.existsSync(candidate));
  if (!systemBinary) return undefined; // The harness downloads a test binary when needed.
  const output = execFileSync(systemBinary, ["--version"], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
  const version = output.match(/db version v(\d+\.\d+\.\d+)/)?.[1];
  return { systemBinary, ...(version ? { version } : {}) };
}

function useTestDatabase() {
  const requestState = {};

  const databaseName = `wtwr_test_${randomUUID().replaceAll("-", "")}`;

  async function clearTestData() {
    if (!requestState.server || mongoose.connection.readyState !== 1) return;
    const { port } = requestState.server.instanceInfo;
    const connectionPort =
      mongoose.connection.getClient().options.hosts[0].port;
    if (mongoose.connection.name !== databaseName || connectionPort !== port) {
      throw new Error(
        "Refusing cleanup outside this disposable test database."
      );
    }
    await Promise.all([User.deleteMany({}), ClothingItem.deleteMany({})]);
  }

  beforeAll(async () => {
    // Deliberately ignore MONGODB_URI; never connect to the developer's database.
    requestState.server = await MongoMemoryServer.create({
      binary: findLocalBinary(),
      instance: { ip: "127.0.0.1", dbName: databaseName },
    });
    await mongoose.connect(requestState.server.getUri(), {
      dbName: databaseName,
    });
    await Promise.all([User.init(), ClothingItem.init()]);
  }, 120000);

  beforeEach(clearTestData);
  afterEach(clearTestData);
  afterAll(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      if (requestState.server) await requestState.server.stop();
    }
  }, 30000);
}

async function seedUser(overrides = {}) {
  const password = overrides.password || "Password1!";
  const values = {
    name: "Test User",
    avatar: "https://example.com/avatar.jpg",
    email: `user-${randomUUID()}@example.com`,
    ...overrides,
    password: await bcrypt.hash(password, 4),
  };
  const user = await User.create(values);
  return {
    user,
    password,
    token: jwt.sign({ _id: user._id.toString() }, JWT_SECRET, {
      expiresIn: "1h",
    }),
  };
}

function garment(owner, overrides = {}) {
  return {
    name: "Test Sweater",
    weather: "warm",
    imageUrl: "https://example.com/sweater.jpg",
    owner,
    ...overrides,
  };
}

module.exports = { useTestDatabase, seedUser, garment };
