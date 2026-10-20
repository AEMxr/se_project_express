const errors = require("../../utils/errors");
const errorHandler = require("../../middlewares/errorHandler");

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
    ["BadRequestError", 400, "Invalid data"],
    ["UnauthorizedError", 401, "Unauthorized"],
    ["ForbiddenError", 403, "Forbidden"],
    ["NotFoundError", 404, "Resource not found"],
    ["ConflictError", 409, "Conflict"],
    ["UnprocessableEntityError", 422, "Invalid data"],
    ["TooManyRequestsError", 429, "Too many requests"],
    ["BadGatewayError", 502, "Bad gateway"],
    ["ServiceUnavailableError", 503, "Service unavailable"],
    ["GatewayTimeoutError", 504, "Gateway timeout"],
  ])(
    "%s supplies a status, default message and standard Error inheritance",
    (name, status, message) => {
      const error = new errors[name]();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(errors.AppError);
      expect(error).toBeInstanceOf(errors[name]);
      expect(error).toMatchObject({
        name,
        statusCode: status,
        message,
        expose: true,
      });
      expect(new errors[name]("Custom")).toMatchObject({ message: "Custom" });
    }
  );
});

describe("Central error responses", () => {
  test.each([
    [{ code: 11000 }, 409, "Duplicate key"],
    [
      { name: "ValidationError", message: "Private field value" },
      400,
      "Invalid data",
    ],
    [{ name: "CastError" }, 400, "Invalid data"],
    [{ name: "DocumentNotFoundError" }, 404, "Resource not found"],
    [
      { type: "entity.parse.failed", body: "password=private" },
      400,
      "Invalid data",
    ],
    [{ type: "entity.too.large" }, 413, "Request body is too large"],
    [new errors.UnauthorizedError("Sign in"), 401, "Sign in"],
    [
      new errors.AppError(500, "Secret", false),
      500,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [
      new errors.AppError(500, "Secret", true),
      500,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [
      new errors.AppError(400, "Secret", false),
      400,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [
      new errors.AppError(399, "Invalid status"),
      500,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [
      new errors.AppError(600, "Invalid status"),
      500,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [
      new errors.AppError("400", "Invalid status"),
      500,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [
      { statusCode: 400, message: "Untrusted exception" },
      500,
      errors.SERVER_ERROR_MESSAGE,
    ],
    [{ code: "ECONNABORTED" }, 504, "Gateway timeout"],
    [{ code: "ETIMEDOUT" }, 504, "Gateway timeout"],
    [{ response: { status: 503 } }, 502, "Bad gateway"],
    [new Error("Secret"), 500, errors.SERVER_ERROR_MESSAGE],
    [undefined, 500, errors.SERVER_ERROR_MESSAGE],
  ])("maps %p to a safe %s JSON response", (error, status, message) => {
    const res = response();
    const next = jest.fn();
    expect(errorHandler(error, {}, res, next)).toBe(res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.send).toHaveBeenCalledWith({ message });
    expect(next).not.toHaveBeenCalled();
  });
  test("does not send a second response when headers have already been sent", () => {
    const error = new Error("stream failed");
    const res = response();
    res.headersSent = true;
    const next = jest.fn();
    errorHandler(error, {}, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
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
