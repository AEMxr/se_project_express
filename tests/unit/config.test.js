describe("Private JWT configuration", () => {
  function loadConfig() {
    const result = {};
    jest.isolateModules(() => {
      result.config = require("../../utils/config");
    });
    return result.config;
  }

  test("uses the provided secret without changing its bytes", () => {
    const secret = "private-test-fixture-secret-at-least-32-characters";
    jest.replaceProperty(process, "env", {
      ...process.env,
      JWT_SECRET: secret,
    });
    expect(loadConfig().JWT_SECRET).toBe(secret);
  });

  test.each([
    undefined,
    "",
    " ".repeat(40),
    "your_jwt_secret_key",
    "short",
    "replace_with_a_generated_private_secret",
  ])("refuses missing, blank or short configuration (%p)", (secret) => {
    jest.replaceProperty(process, "env", { ...process.env });
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    expect(loadConfig).toThrow("Set JWT_SECRET to a private random value");
  });
});
