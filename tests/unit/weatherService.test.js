const { createWeatherService } = require("../../services/weather");

const apiKey = "server-test-secret-not-real";
const weather = {
  name: "Vancouver",
  main: { temp: 70, humidity: 80 },
  weather: [{ main: "Clouds", description: "Overcast" }],
  dt: 150,
  sys: { sunrise: 100, sunset: 200 },
  request: { appid: apiKey, url: "private provider request" },
};
const expected = {
  name: "Vancouver",
  main: { temp: 70 },
  weather: [{ main: "Clouds" }],
  dt: 150,
  sys: { sunrise: 100, sunset: 200 },
};
const response = (body = weather, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});
const testState = {};

beforeEach(() => {
  testState.fetchImpl = jest.fn().mockResolvedValue(response());
});
afterEach(() => jest.useRealTimers());
const service = (options = {}) =>
  createWeatherService({
    fetchImpl: testState.fetchImpl,
    getApiKey: () => apiKey,
    ...options,
  });

describe("Server-only weather requests", () => {
  test("uses the fixed provider, server key, imperial units, timeout and no redirects", async () => {
    const getWeather = service();
    await expect(getWeather(49.281, -123.121)).resolves.toEqual(expected);
    const [url, options] = testState.fetchImpl.mock.calls[0];
    expect(url.origin).toBe("https://api.openweathermap.org");
    expect(url.pathname).toBe("/data/2.5/weather");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: "49.28",
      lon: "-123.12",
      units: "imperial",
      appid: apiKey,
    });
    expect(options.redirect).toBe("error");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(await getWeather(49.281, -123.121))).not.toContain(
      apiKey
    );
  });

  test.each([undefined, "", "  ", "your_openweather_key"])(
    "missing/placeholder backend configuration returns 503 (%p)",
    async (key) => {
      await expect(
        service({ getApiKey: () => key })(1, 2)
      ).rejects.toMatchObject({ statusCode: 503 });
      expect(testState.fetchImpl).not.toHaveBeenCalled();
    }
  );

  test.each([
    { main: { temp: null } },
    { main: { temp: "70" } },
    { main: { temp: Infinity } },
    { dt: undefined },
    { sys: { sunrise: null, sunset: 200 } },
    { sys: undefined },
  ])(
    "rejects malformed provider weather without forwarding its body (%p)",
    async (changes) => {
      testState.fetchImpl.mockResolvedValue(
        response({ ...weather, ...changes })
      );
      await expect(service()(1, 2)).rejects.toMatchObject({
        statusCode: 502,
        message: "Weather is unavailable. Please try again later.",
      });
    }
  );

  test("normalizes missing optional values and unknown condition strings", async () => {
    testState.fetchImpl.mockResolvedValue(
      response({ ...weather, name: null, weather: undefined })
    );
    await expect(service()(1, 2)).resolves.toMatchObject({
      name: "Unknown location",
      weather: [{ main: "Clear" }],
    });
    testState.fetchImpl.mockResolvedValue(
      response({
        ...weather,
        name: "x".repeat(101),
        weather: [{ main: apiKey }],
      })
    );
    const result = await service()(1, 2);
    expect(result.name).toBe("Unknown location");
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });

  test("rejects an accidentally reflected key in a whitelisted text field", async () => {
    testState.fetchImpl.mockResolvedValue(
      response({ ...weather, name: apiKey })
    );
    await expect(service()(1, 2)).rejects.toMatchObject({ statusCode: 502 });
  });

  test.each([
    [401, 502],
    [403, 502],
    [404, 502],
    [500, 502],
    [429, 503],
  ])(
    "maps upstream %s to safe %s without reading the upstream error body",
    async (status, expectedStatus) => {
      const upstream = response({ message: apiKey }, status);
      testState.fetchImpl.mockResolvedValue(upstream);
      await expect(service()(1, 2)).rejects.toMatchObject({
        statusCode: expectedStatus,
        message: "Weather is unavailable. Please try again later.",
      });
      expect(upstream.json).not.toHaveBeenCalled();
    }
  );

  test("drops network exception URLs, causes and credentials", async () => {
    testState.fetchImpl.mockRejectedValue(
      new Error(`Provider URL ?appid=${apiKey}`)
    );
    const error = await service()(1, 2).catch((failure) => failure);
    expect(error.statusCode).toBe(502);
    expect(error.cause).toBeUndefined();
    expect(error.stack).not.toContain(apiKey);
  });

  test("invalid provider JSON becomes a safe 502", async () => {
    const upstream = response();
    upstream.json.mockRejectedValue(
      new SyntaxError(`Invalid response with ${apiKey}`)
    );
    testState.fetchImpl.mockResolvedValue(upstream);
    await expect(service()(1, 2)).rejects.toMatchObject({
      statusCode: 502,
      message: "Weather is unavailable. Please try again later.",
    });
  });

  test("aborts a slow upstream request, returns 504 and clears the timeout", async () => {
    jest.useFakeTimers();
    const requestState = {};

    testState.fetchImpl.mockImplementation((url, options) => {
      requestState.signal = options.signal;
      return new Promise((resolve, reject) => {
        requestState.signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true }
        );
      });
    });
    const pending = expect(
      service({ timeoutMs: 100 })(1, 2)
    ).rejects.toMatchObject({ statusCode: 504 });
    await jest.advanceTimersByTimeAsync(100);
    await pending;
    expect(requestState.signal.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("Bounded caching and concurrent requests", () => {
  test("reuses fresh weather without allowing callers to mutate the cache, and refreshes after expiry", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1000);
    const getWeather = service({ cacheTtlMs: 100 });
    const first = await getWeather(1, 2);
    first.main.temp = -999;
    expect(await getWeather(1, 2)).toEqual(expected);
    expect(testState.fetchImpl).toHaveBeenCalledTimes(1);
    now.mockReturnValue(1100);
    expect(await getWeather(1, 2)).toEqual(expected);
    expect(testState.fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("coalesces simultaneous requests for the same nearby location", async () => {
    const requestState = {};

    testState.fetchImpl.mockReturnValue(
      new Promise((resolve) => {
        requestState.release = resolve;
      })
    );
    const getWeather = service();
    const first = getWeather(49.281, -123.121);
    const second = getWeather(49.284, -123.124);
    expect(testState.fetchImpl).toHaveBeenCalledTimes(1);
    requestState.release(response());
    const results = await Promise.all([first, second]);
    expect(results).toEqual([expected, expected]);
    expect(results[0]).not.toBe(results[1]);
  });

  test("evicts old locations when the cache reaches its bound", async () => {
    const getWeather = service({ maxCacheEntries: 2 });
    await getWeather(1, 2);
    await getWeather(3, 4);
    await getWeather(5, 6);
    await getWeather(1, 2);
    expect(testState.fetchImpl).toHaveBeenCalledTimes(4);
  });

  test("does not reuse cached weather under another server key", async () => {
    const requestState = {};
    requestState.key = apiKey;
    const getWeather = service({ getApiKey: () => requestState.key });
    await getWeather(1, 2);
    requestState.key = "replacement-test-key";
    await getWeather(1, 2);
    expect(testState.fetchImpl).toHaveBeenCalledTimes(2);
    expect(testState.fetchImpl.mock.calls[1][0].searchParams.get("appid")).toBe(
      requestState.key
    );
  });

  test("failed requests are not cached and can be retried", async () => {
    testState.fetchImpl.mockRejectedValueOnce(new Error("Offline"));
    const getWeather = service();
    await expect(getWeather(1, 2)).rejects.toMatchObject({ statusCode: 502 });
    await expect(getWeather(1, 2)).resolves.toEqual(expected);
    expect(testState.fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("bounds concurrent upstream work and frees capacity after completion", async () => {
    const requestState = {};

    testState.fetchImpl.mockReturnValueOnce(
      new Promise((resolve) => {
        requestState.release = resolve;
      })
    );
    const getWeather = service({ maxConcurrentRequests: 1 });
    const first = getWeather(1, 2);
    await expect(getWeather(3, 4)).rejects.toMatchObject({ statusCode: 503 });
    expect(testState.fetchImpl).toHaveBeenCalledTimes(1);
    requestState.release(response());
    await first;
    await expect(getWeather(3, 4)).resolves.toEqual(expected);
  });
});
