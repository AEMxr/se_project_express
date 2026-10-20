// Public fixture only: tests never load or use a developer's signing secret.
process.env.JWT_SECRET = "jest-only-signing-secret-with-no-real-accounts";

beforeEach(() => {
  // Expected error-response tests should not flood the test report with logs.
  jest.spyOn(console, "error").mockImplementation(() => {});
});
