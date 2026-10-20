const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseEnv } = require("node:util");
const setupEnvironment = require("../../utils/setupEnvironment");

const fixture = {};
beforeEach(() => {
  fixture.directory = fs.mkdtempSync(path.join(os.tmpdir(), "wtwr-env-test-"));
  fixture.local = path.join(fixture.directory, ".env.local");
  fixture.example = path.join(fixture.directory, ".env.example");
  fs.writeFileSync(
    fixture.example,
    "JWT_SECRET=replace_with_a_generated_private_secret\nOPEN_WEATHER_API_KEY=your_openweather_key\n"
  );
});
afterEach(() => {
  [fixture.local, fixture.example].forEach((file) => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
  fs.rmdirSync(fixture.directory);
});

describe("Private local configuration setup", () => {
  test("a fresh clone gets a random signing secret and keeps the weather placeholder", () => {
    setupEnvironment(fixture.directory);
    const values = parseEnv(fs.readFileSync(fixture.local, "utf8"));
    expect(values.JWT_SECRET).toMatch(/^[a-f0-9]{64}$/);
    expect(values.OPEN_WEATHER_API_KEY).toBe("your_openweather_key");
  });
  test("a rerun leaves an existing private secret and weather configuration unchanged", () => {
    const contents =
      "JWT_SECRET=private-fixture-secret-of-at-least-32-characters\nOPEN_WEATHER_API_KEY=weather-fixture-not-real\n";
    fs.writeFileSync(fixture.local, contents);
    setupEnvironment(fixture.directory);
    expect(fs.readFileSync(fixture.local, "utf8")).toBe(contents);
  });
  test.each([
    "",
    "JWT_SECRET=short\n",
    "JWT_SECRET=replace_with_a_generated_private_secret\n",
  ])(
    "repairs missing/weak signing settings without changing weather settings (%p)",
    (prefix) => {
      fs.writeFileSync(
        fixture.local,
        `${prefix}OPEN_WEATHER_API_KEY=weather-fixture-not-real\n`
      );
      setupEnvironment(fixture.directory);
      const values = parseEnv(fs.readFileSync(fixture.local, "utf8"));
      expect(values.JWT_SECRET).toMatch(/^[a-f0-9]{64}$/);
      expect(values.OPEN_WEATHER_API_KEY).toBe("weather-fixture-not-real");
    }
  );
  test("preserves a valid secret supplied by a local template", () => {
    const contents =
      "JWT_SECRET=another-private-fixture-secret-at-least-32-characters\n";
    fs.writeFileSync(fixture.example, contents);
    setupEnvironment(fixture.directory);
    expect(fs.readFileSync(fixture.local, "utf8")).toBe(contents);
  });
});
