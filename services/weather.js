const {
  AppError,
  BadGatewayError,
  GatewayTimeoutError,
  ServiceUnavailableError,
} = require("../utils/errors");

const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const WEATHER_UNAVAILABLE = "Weather is unavailable. Please try again later.";
const WEATHER_CONDITIONS = new Set([
  "Clear",
  "Clouds",
  "Rain",
  "Drizzle",
  "Thunderstorm",
  "Snow",
  "Mist",
  "Fog",
  "Haze",
  "Smoke",
  "Dust",
  "Sand",
  "Ash",
  "Squall",
  "Tornado",
]);

function publicWeather(data, apiKey) {
  if (
    !Number.isFinite(data?.main?.temp) ||
    !Number.isFinite(data?.dt) ||
    !Number.isFinite(data?.sys?.sunrise) ||
    !Number.isFinite(data?.sys?.sunset)
  ) {
    throw new BadGatewayError(WEATHER_UNAVAILABLE);
  }
  const city =
    typeof data.name === "string" && data.name.length <= 100 ? data.name : "";
  if (city.includes(apiKey)) {
    throw new BadGatewayError(WEATHER_UNAVAILABLE);
  }
  const condition = data.weather?.[0]?.main;
  // Never relay provider headers, URLs, diagnostic fields or arbitrary JSON.
  return {
    name: city || "Unknown location",
    main: { temp: data.main.temp },
    weather: [
      { main: WEATHER_CONDITIONS.has(condition) ? condition : "Clear" },
    ],
    dt: data.dt,
    sys: { sunrise: data.sys.sunrise, sunset: data.sys.sunset },
  };
}

function createWeatherService({
  fetchImpl = (...args) => globalThis.fetch(...args),
  getApiKey = () => process.env.OPEN_WEATHER_API_KEY,
  cacheTtlMs = 5 * 60 * 1000,
  maxCacheEntries = 100,
  maxConcurrentRequests = 10,
  timeoutMs = 8000,
} = {}) {
  const cache = new Map();
  const pending = new Map();

  async function requestWeather(latitude, longitude, apiKey) {
    const url = new URL(WEATHER_URL);
    url.search = new URLSearchParams({
      lat: latitude,
      lon: longitude,
      units: "imperial",
      appid: apiKey,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        signal: controller.signal,
        redirect: "error",
      });
      if (response.status === 429) {
        throw new ServiceUnavailableError(WEATHER_UNAVAILABLE);
      }
      if (!response.ok) {
        throw new BadGatewayError(WEATHER_UNAVAILABLE);
      }
      return publicWeather(await response.json(), apiKey);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (controller.signal.aborted) {
        throw new GatewayTimeoutError(WEATHER_UNAVAILABLE);
      }
      // Fetch errors may embed the request URL (including appid). Discard the
      // original exception instead of forwarding its message, cause or stack.
      throw new BadGatewayError(WEATHER_UNAVAILABLE);
    } finally {
      clearTimeout(timeout);
    }
  }

  return async function getWeather(latitude, longitude) {
    const apiKey = getApiKey()?.trim();
    if (!apiKey || apiKey === "your_openweather_key") {
      throw new ServiceUnavailableError(WEATHER_UNAVAILABLE);
    }
    const lat = latitude.toFixed(2);
    const lon = longitude.toFixed(2);
    const cacheKey = `${apiKey}:${lat}:${lon}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return structuredClone(cached.data);
    }
    cache.delete(cacheKey);

    let request = pending.get(cacheKey);
    if (!request) {
      if (pending.size >= maxConcurrentRequests) {
        throw new ServiceUnavailableError(WEATHER_UNAVAILABLE);
      }
      request = requestWeather(lat, lon, apiKey).then((data) => {
        if (cache.size >= maxCacheEntries) {
          cache.delete(cache.keys().next().value);
        }
        cache.set(cacheKey, { data, expiresAt: Date.now() + cacheTtlMs });
        return data;
      });
      pending.set(cacheKey, request);
    }
    try {
      return structuredClone(await request);
    } finally {
      pending.delete(cacheKey);
    }
  };
}

module.exports = {
  createWeatherService,
  getWeather: createWeatherService(),
};
