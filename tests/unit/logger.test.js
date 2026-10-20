const { Writable } = require("node:stream");
const winston = require("winston");
const express = require("express");
const supertest = require("supertest");
const { celebrate, Joi, errors } = require("celebrate");
const { createLoggers } = require("../../middlewares/logger");
const errorHandler = require("../../middlewares/errorHandler");
const { AppError } = require("../../utils/errors");

function capture(entries) {
  return new winston.transports.Stream({
    stream: new Writable({
      objectMode: true,
      write(entry, encoding, callback) {
        entries.push(entry);
        callback();
      },
    }),
  });
}

let logs;
let requests;
let failures;
let request;
beforeEach(() => {
  requests = [];
  failures = [];
  logs = createLoggers({
    requestTransports: [capture(requests)],
    errorTransports: [capture(failures)],
  });
  const app = express();
  app.use(logs.requestLogger);
  app.use(express.json());
  app.post("/signin", (req, res) =>
    res.send({ token: "response-secret-token" })
  );
  app.post(
    "/validation",
    celebrate(
      {
        body: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().min(8).required(),
        }),
      },
      { abortEarly: false }
    ),
    (req, res) => res.send({ ok: true })
  );
  app.get("/failure/:itemId", (req, res, next) => {
    const error = new Error("Private password=server-secret");
    error.token = "error-secret-token";
    next(error);
  });
  app.get("/untyped", (req, res, next) => next({}));
  app.get("/stackless", (req, res, next) =>
    next(new AppError(500, "Secret message", true))
  );
  app.use(logs.errorLogger);
  app.use(errors());
  app.use(errorHandler);
  request = supertest(app);
});
afterEach(() => {
  logs.requestLog.close();
  logs.errorLog.close();
});

describe("Request and error logging", () => {
  test("records request method, route, status and timestamp without credentials", async () => {
    await request
      .post("/signin?token=query-secret")
      .set("Authorization", "Bearer header-secret")
      .set("Cookie", "jwt=cookie-secret")
      .send({ email: "private@example.com", password: "body-secret" })
      .expect(200);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      level: "info",
      message: "HTTP POST 200",
      meta: {
        req: { method: "POST" },
        res: { statusCode: 200 },
        route: "/signin",
      },
      timestamp: expect.any(String),
    });
    const output = JSON.stringify(requests);
    [
      "query-secret",
      "header-secret",
      "cookie-secret",
      "private@example.com",
      "body-secret",
      "response-secret-token",
    ].forEach((secret) => expect(output).not.toContain(secret));
    expect(failures).toHaveLength(0);
  });

  test("logs validation errors once and never includes the rejected request body", async () => {
    const result = await request
      .post("/validation?token=query-secret")
      .set("Authorization", "Bearer header-secret")
      .send({ email: "invalid-secret-email", password: "pw" })
      .expect(400);
    expect(result.body.validation.body.keys).toEqual(["email", "password"]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      message: "HTTP request failed",
      meta: { errorName: "Error", statusCode: 400, route: "/validation" },
    });
    const output = JSON.stringify([...requests, ...failures]);
    ["invalid-secret-email", "query-secret", "header-secret", '"pw"'].forEach(
      (secret) => expect(output).not.toContain(secret)
    );
    expect(requests[0].meta.res.statusCode).toBe(400);
  });

  test("records stack locations for server errors without exception values or actual URL parameters", async () => {
    const result = await request
      .get("/failure/private-url-secret?password=query-secret")
      .expect(500);
    expect(result.body).toEqual({
      message: "An error has occurred on the server.",
    });
    expect(failures).toHaveLength(1);
    expect(failures[0].meta).toMatchObject({
      errorName: "Error",
      statusCode: 500,
      route: "/failure/:itemId",
      stack: expect.stringContaining("at "),
    });
    const output = JSON.stringify([...requests, ...failures]);
    [
      "server-secret",
      "error-secret-token",
      "private-url-secret",
      "query-secret",
    ].forEach((secret) => expect(output).not.toContain(secret));
    expect(requests[0].meta.res.statusCode).toBe(500);
  });

  test("malformed JSON is logged before the central parser error response", async () => {
    await request
      .post("/signin")
      .set("Content-Type", "application/json")
      .send('{"password":"malformed-secret"')
      .expect(400);
    expect(failures).toHaveLength(1);
    expect(failures[0].meta).toMatchObject({
      statusCode: 400,
      route: "(unmatched)",
    });
    expect(JSON.stringify([...requests, ...failures])).not.toContain(
      "malformed-secret"
    );
  });

  test("unknown routes use a placeholder instead of logging arbitrary URL values", async () => {
    await request.get("/path-secret?token=query-secret").expect(404);
    expect(requests[0].meta.route).toBe("(unmatched)");
    expect(JSON.stringify(requests)).not.toContain("path-secret");
    expect(JSON.stringify(requests)).not.toContain("query-secret");
  });

  test("errors without a name or stack still reach a safe 500 response", async () => {
    await request.get("/untyped").expect(500);
    expect(failures[0].meta).toMatchObject({
      errorName: "Error",
      statusCode: 500,
    });
    expect(failures[0].meta.stack).toBeUndefined();
    await request
      .get("/stackless")
      .expect(500, { message: "An error has occurred on the server." });
  });

  test("default test loggers do not create file transports", () => {
    const defaults = createLoggers();
    [defaults.requestLog, defaults.errorLog].forEach((logger) => {
      expect(logger.transports).toHaveLength(1);
      expect(logger.transports[0]).toBeInstanceOf(winston.transports.Console);
      expect(logger.transports[0].silent).toBe(true);
      logger.close();
    });
  });

  test("normal startup configures separate bounded request and error files", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production");
    const file = jest
      .spyOn(winston.transports, "File")
      .mockImplementation(() => capture([]));
    const production = createLoggers();
    expect(file).toHaveBeenCalledTimes(2);
    expect(file).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        filename: expect.stringMatching(/logs[\\/]request\.log$/),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
      })
    );
    expect(file).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        filename: expect.stringMatching(/logs[\\/]error\.log$/),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
      })
    );
    production.requestLog.close();
    production.errorLog.close();
  });
});
