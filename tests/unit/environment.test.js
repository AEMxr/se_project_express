const path = require("node:path");
const loadEnvironment = require("../../utils/loadEnvironment");

describe("Server-only environment loading", () => {
  test("never loads local credentials during tests", () => {
    const load = jest
      .spyOn(process, "loadEnvFile")
      .mockImplementation(() => {});
    loadEnvironment();
    expect(load).not.toHaveBeenCalled();
  });
  test("normal startup reads only the backend worktree's local configuration", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "development");
    const load = jest
      .spyOn(process, "loadEnvFile")
      .mockImplementation(() => {});
    loadEnvironment();
    expect(load).toHaveBeenCalledWith(
      path.resolve(__dirname, "../../.env.local")
    );
  });
  test("hosting environment variables work without a local file", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production");
    jest.spyOn(process, "loadEnvFile").mockImplementation(() => {
      throw Object.assign(new Error("Missing local file"), { code: "ENOENT" });
    });
    expect(loadEnvironment).not.toThrow();
  });
  test("configuration failures do not print file contents or credentials", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production");
    jest.spyOn(process, "loadEnvFile").mockImplementation(() => {
      throw Object.assign(new Error("private-key-value"), { code: "EACCES" });
    });
    expect(loadEnvironment).toThrow(
      "Unable to load backend environment configuration"
    );
  });
});
