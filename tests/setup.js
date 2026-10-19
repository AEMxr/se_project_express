beforeEach(() => {
  // Expected error-response tests should not flood the test report with logs.
  jest.spyOn(console, "error").mockImplementation(() => {});
});
