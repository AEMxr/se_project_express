const errors = require("../../utils/errors");

function response() {
  const res = { status: jest.fn(), send: jest.fn(), end: jest.fn() };
  Object.values(res).forEach((method) => method.mockReturnValue(res));
  return res;
}

describe("Application errors", () => {
  test("AppError retains status, message and exposure policy", () => {
    expect(new errors.AppError(400, "Invalid", false)).toMatchObject({
      statusCode: 400,
      message: "Invalid",
      expose: false,
    });
  });
  test.each([
    ["UnauthorizedError", 401, "Unauthorized"],
    ["ForbiddenError", 403, "Forbidden"],
    ["ConflictError", 409, "Conflict"],
    ["UnprocessableEntityError", 422, "Invalid data"],
    ["TooManyRequestsError", 429, "Too many requests"],
    ["BadGatewayError", 502, "Bad gateway"],
    ["ServiceUnavailableError", 503, "Service unavailable"],
    ["GatewayTimeoutError", 504, "Gateway timeout"],
  ])(
    "%s supplies the right status and can override its default message",
    (name, status, message) => {
      expect(new errors[name]()).toMatchObject({
        name,
        statusCode: status,
        message,
        expose: true,
      });
      expect(new errors[name]("Custom")).toMatchObject({ message: "Custom" });
    }
  );
});

describe("Mongoose error responses", () => {
  test.each([
    [{ code: 11000 }, 409, "Duplicate key"],
    [{ name: "ValidationError" }, 400, "Invalid data"],
    [{ name: "CastError" }, 400, "Invalid data"],
    [{ name: "DocumentNotFoundError" }, 404, "Resource not found"],
    [{ statusCode: 404 }, 404, "Resource not found"],
    [new Error("Private details"), 500, errors.SERVER_ERROR_MESSAGE],
  ])(
    "maps %p to %s without leaking private error details",
    (error, status, message) => {
      const res = response();
      errors.handleMongooseError(res, error);
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.send).toHaveBeenCalledWith({ message });
    }
  );
  test("can report validation failures as 422", () => {
    const res = response();
    errors.handleMongooseError(
      res,
      { name: "ValidationError" },
      {},
      { validationAs422: true }
    );
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

describe("General error responses", () => {
  test.each([
    [new errors.UnauthorizedError("Sign in"), 401, "Sign in"],
    [
      new errors.AppError(500, "Secret", false),
      500,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [{ code: "ECONNABORTED" }, 504, "Gateway timeout"],
    [{ code: "ETIMEDOUT" }, 504, "Gateway timeout"],
    [{ response: { status: 503 } }, 502, "Bad gateway"],
    [new Error("Secret"), 500, errors.SERVER_ERROR_MESSAGE],
    [undefined, 500, errors.SERVER_ERROR_MESSAGE],
  ])("returns a safe response for %p", (error, status, message) => {
    const res = response();
    errors.handleAppError(res, error);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.send).toHaveBeenCalledWith({ message });
  });
});

describe("Response helpers", () => {
  test.each([
    ["ok", 200],
    ["created", 201],
  ])("%s sends data with status %s", (name, status) => {
    const res = response();
    const body = { value: "data" };
    expect(errors[name](res, body)).toBe(res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.send).toHaveBeenCalledWith(body);
  });
  test("noContent ends a 204 response without a body", () => {
    const res = response();
    errors.noContent(res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(res.send).not.toHaveBeenCalled();
  });
});
