const express = require("express");
const supertest = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../app");
const User = require("../../models/user");
const errorHandler = require("../../middlewares/errorHandler");
const { UnauthorizedError } = require("../../utils/errors");
const {
  createCors,
  createSecurityHeaders,
} = require("../../middlewares/security");
const { createAuthLimiter } = require("../../middlewares/authLimiter");

const request = supertest(app);
const signup = {
  name: "Test User",
  email: "test@example.com",
  password: "Password1!",
  avatar: "https://example.com/avatar.jpg",
};

function testApp(middleware, status = 200) {
  const server = express();
  server.use(middleware);
  server.use((req, res) => res.sendStatus(status));
  server.use(errorHandler);
  return supertest(server);
}

describe("Known routes and genuine 404 responses", () => {
  test.each(["/missing", "/users/missing", "/items/missing/path"])(
    "unknown route %s is 404 without authentication",
    async (path) => {
      await request
        .get(path)
        .expect(404, { message: "Requested resource not found" });
    }
  );
  test.each([
    ["get", "/users/me"],
    ["patch", "/users/me"],
    ["post", "/items"],
    ["delete", "/items/0123456789abcdef01234567"],
    ["put", "/items/0123456789abcdef01234567/likes"],
    ["delete", "/items/0123456789abcdef01234567/likes"],
  ])("known protected %s %s still requires a JWT", async (method, path) => {
    await request[method](path).expect(401);
  });
});

describe("Configured browser origins", () => {
  test.each([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://aemxr.github.io",
  ])("allows the expected frontend %s", async (origin) => {
    const result = await request.get("/").set("Origin", origin).expect(200);
    expect(result.headers["access-control-allow-origin"]).toBe(origin);
    expect(result.headers["access-control-allow-credentials"]).toBeUndefined();
  });
  test("allows HTTP clients without Origin, without a wildcard CORS header", async () => {
    const result = await request.get("/").expect(200);
    expect(result.headers["access-control-allow-origin"]).toBeUndefined();
  });
  test.each([
    "https://attacker.example",
    "https://aemxr.github.io.attacker.example",
    "null",
  ])("rejects an unapproved origin %s", async (origin) => {
    const result = await request
      .post("/signup")
      .set("Origin", origin)
      .send(signup)
      .expect(403);
    expect(result.headers["access-control-allow-origin"]).toBeUndefined();
  });
  test("preflight permits authorization and the profile PATCH method", async () => {
    const result = await request
      .options("/users/me")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "authorization,content-type")
      .expect(204);
    expect(result.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(
      result.headers["access-control-allow-headers"].toLowerCase()
    ).toContain("authorization");
  });
  test("a configured list replaces defaults and normalizes URL origins", async () => {
    const custom = testApp(
      createCors({
        origins: "https://Wardrobe.example/, http://localhost:3002",
      })
    );
    await custom.get("/").set("Origin", "https://wardrobe.example").expect(200);
    await custom.get("/").set("Origin", "http://localhost:3000").expect(403);
  });
  test.each([
    "*",
    "null",
    "ftp://example.com",
    "https://user:password@example.com",
    "https://example.com/path",
    "https://example.com?key=value",
    "https://example.com#fragment",
    "https://example.com,",
  ])("refuses invalid origin configuration %s", (origins) => {
    expect(() => createCors({ origins })).toThrow("CLIENT_ORIGINS");
  });
});

describe("API security headers and request bounds", () => {
  test.each(["/", "/missing"])("headers are present on %s", async (path) => {
    const result = await request.get(path);
    expect(result.headers["x-powered-by"]).toBeUndefined();
    expect(result.headers["x-content-type-options"]).toBe("nosniff");
    expect(result.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(result.headers["referrer-policy"]).toBe("no-referrer");
    expect(result.headers["content-security-policy"]).toContain(
      "default-src 'self'"
    );
    expect(result.headers["strict-transport-security"]).toBeUndefined();
  });
  test("production sets HSTS, while local HTTP does not upgrade to HTTPS", async () => {
    const production = await testApp(
      createSecurityHeaders({ environment: "production" })
    ).get("/");
    expect(production.headers["strict-transport-security"]).toContain(
      "max-age="
    );
    expect(production.headers["content-security-policy"]).toContain(
      "upgrade-insecure-requests"
    );
    const development = await testApp(
      createSecurityHeaders({ environment: "development" })
    ).get("/");
    expect(development.headers["strict-transport-security"]).toBeUndefined();
    expect(development.headers["content-security-policy"]).not.toContain(
      "upgrade-insecure-requests"
    );
  });
  test("oversized JSON is rejected before signup hashing", async () => {
    const hash = jest.spyOn(bcrypt, "hash");
    await request
      .post("/signup")
      .send({ ...signup, name: "a".repeat(110 * 1024) })
      .expect(413);
    expect(hash).not.toHaveBeenCalled();
  });
});

describe("Authentication abuse limits", () => {
  test("failed signin requests are bounded before more credential work", async () => {
    const find = jest
      .spyOn(User, "findUserByCredentials")
      .mockRejectedValue(new UnauthorizedError("Incorrect email or password"));
    await Array.from({ length: 20 }).reduce(
      (pending) =>
        pending.then(() =>
          request
            .post("/signin")
            .send({ email: signup.email, password: signup.password })
            .expect(401)
        ),
      Promise.resolve()
    );
    const blocked = await request
      .post("/signin")
      .send({ email: signup.email, password: signup.password })
      .expect(429);
    expect(blocked.body.message).toContain("Too many authentication requests");
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(find).toHaveBeenCalledTimes(20);
  });
  test("signup attempts have their own quota before password hashing", async () => {
    const hash = jest.spyOn(bcrypt, "hash").mockResolvedValue("fixture-hash");
    jest.spyOn(User, "create").mockResolvedValue({
      toObject: () => ({ name: signup.name, password: "fixture-hash" }),
    });
    await Array.from({ length: 20 }).reduce(
      (pending) =>
        pending.then(() => request.post("/signup").send(signup).expect(201)),
      Promise.resolve()
    );
    await request.post("/signup").send(signup).expect(429);
    expect(hash).toHaveBeenCalledTimes(20);
  });
  test("successful signins do not consume the failure quota", async () => {
    const successes = testApp(
      createAuthLimiter({ limit: 1, skipSuccessfulRequests: true })
    );
    await successes.get("/").expect(200);
    await successes.get("/").expect(200);
    const failures = testApp(createAuthLimiter({ limit: 1 }), 401);
    await failures.get("/").expect(401);
    await failures.get("/").expect(429);
  });
  test("limits are independent per client IP", async () => {
    const server = express();
    server.set("trust proxy", "loopback");
    server.use(createAuthLimiter({ limit: 1 }));
    server.use((req, res) => res.sendStatus(200));
    server.use(errorHandler);
    const limited = supertest(server);
    await limited.get("/").set("X-Forwarded-For", "192.0.2.1").expect(200);
    await limited.get("/").set("X-Forwarded-For", "192.0.2.1").expect(429);
    await limited.get("/").set("X-Forwarded-For", "192.0.2.2").expect(200);
  });
});
