const express = require("express");
const supertest = require("supertest");
const winston = require("winston");
const app = require("../../app");
const errorHandler = require("../../middlewares/errorHandler");
const { createWeatherLimiter } = require("../../middlewares/weatherLimiter");

const apiKey = "endpoint-test-key-not-real";
const request = supertest(app);
const testState = {};

beforeEach(() => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    OPEN_WEATHER_API_KEY: apiKey,
  });
  testState.upstream = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      name: "Vancouver",
      main: { temp: 70, pressure: 123 },
      weather: [{ main: "Clear" }],
      dt: 100,
      sys: { sunrise: 0, sunset: 200 },
      request: { appid: apiKey },
      diagnosticUrl: `https://provider.invalid/?appid=${apiKey}`,
    }),
  });
});

describe("GET /weather uses the backend key only", () => {
  test("guests receive whitelisted weather without credentials or provider diagnostics", async () => {
    const result = await request
      .get("/weather?lat=49.28&lon=-123.12")
      .expect(200);
    expect(result.body).toEqual({
      name: "Vancouver",
      main: { temp: 70 },
      weather: [{ main: "Clear" }],
      dt: 100,
      sys: { sunrise: 0, sunset: 200 },
    });
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers.ratelimit).toBeDefined();
    expect(JSON.stringify(result.body)).not.toContain(apiKey);
    const url = testState.upstream.mock.calls[0][0];
    expect(url.origin).toBe("https://api.openweathermap.org");
    expect(url.searchParams.get("appid")).toBe(apiKey);
  });
  test.each([
    "",
    "?lat=1",
    "?lat=91&lon=1",
    "?lat=1&lon=-181",
    "?lat=NaN&lon=1",
    "?lat=1&lat=2&lon=3",
    "?lat[$ne]=0&lon=1",
    "?lat=1&lon=2&appid=caller-key",
    "?lat=1&lon=2&url=https://attacker.invalid",
    "?lat=1&lon=2&units=metric",
  ])(
    "rejects invalid coordinates and unrecognized query fields before fetching (%s)",
    async (query) => {
      await request.get(`/weather${query}`).expect(400);
      expect(testState.upstream).not.toHaveBeenCalled();
    }
  );
  test("accepts coordinate boundaries", async () => {
    await request.get("/weather?lat=-90&lon=180").expect(200);
    expect(testState.upstream.mock.calls[0][0].searchParams.get("lat")).toBe(
      "-90.00"
    );
  });
  test("missing server configuration returns 503 without a provider request", async () => {
    delete process.env.OPEN_WEATHER_API_KEY;
    await request.get("/weather?lat=1&lon=2").expect(503, {
      message: "Weather is unavailable. Please try again later.",
    });
    expect(testState.upstream).not.toHaveBeenCalled();
  });
  test("provider URL errors never reach HTTP responses or structured logs", async () => {
    const log = jest.spyOn(winston.Logger.prototype, "log");
    testState.upstream.mockRejectedValue(
      new Error(`https://provider.invalid/?appid=${apiKey}`)
    );
    const result = await request.get("/weather?lat=3&lon=4").expect(502);
    expect(result.body.message).toBe(
      "Weather is unavailable. Please try again later."
    );
    expect(
      JSON.stringify({
        headers: result.headers,
        body: result.body,
        logs: log.mock.calls,
      })
    ).not.toContain(apiKey);
  });
  test("a provider authorization failure does not sign the browser out with 401", async () => {
    testState.upstream.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    });
    await request.get("/weather?lat=5&lon=6").expect(502);
  });
});

describe("Weather rate limiting", () => {
  test("limits repeated calls before controller work and sends a useful JSON 429", async () => {
    const server = express();
    const controller = jest.fn((req, res) => res.send({ ok: true }));
    server.get("/weather", createWeatherLimiter({ limit: 2 }), controller);
    server.use(errorHandler);
    const limited = supertest(server);
    await limited.get("/weather").expect(200);
    await limited.get("/weather").expect(200);
    const blocked = await limited.get("/weather").expect(429, {
      message: "Too many weather requests. Please try again later.",
    });
    expect(controller).toHaveBeenCalledTimes(2);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });
});
