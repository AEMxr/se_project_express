const supertest = require("supertest");
const app = require("../../app");

const request = supertest(app);

describe("Diagnostic routes are limited to explicit development and test environments", () => {
  test.each(["production", "staging", undefined])(
    "hides diagnostics in %p",
    async (environment) => {
      jest.replaceProperty(process, "env", { ...process.env });
      if (environment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = environment;
      await request
        .get("/test-errors/500")
        .expect(404, { message: "Requested resource not found" });
    }
  );
  test.each(["development", "test"])(
    "keeps diagnostic responses in %s",
    async (environment) => {
      jest.replaceProperty(process.env, "NODE_ENV", environment);
      await request
        .get("/test-errors/400")
        .expect(400, { message: "Invalid data" });
    }
  );
});
