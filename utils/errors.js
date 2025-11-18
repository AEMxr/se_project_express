// I rewrote it to satisfy the unused values you addressed,
// while working with Dot to keep it comprehensive and in scope of the project.
// This should cover the client side getting generic messages
// While the developer keeps an explicit description.
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;

const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;
const UNPROCESSABLE_ENTITY = 422;
const TOO_MANY_REQUESTS = 429;

const INTERNAL_SERVER_ERROR = 500;
const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;
const GATEWAY_TIMEOUT = 504;

const SERVER_ERROR_MESSAGE = "An error has occurred on the server.";

const MONGO_DUPLICATE_KEY = 11000;
const MONGOOSE_ERRORS = {
  CAST: "CastError",
  VALIDATION: "ValidationError",
  NOT_FOUND: "DocumentNotFoundError",
};

class AppError extends Error {
  constructor(statusCode, message, expose = true) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose; // if false, respond with generic 500 text
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(UNAUTHORIZED, message);
  }
}
class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(FORBIDDEN, message);
  }
}
class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(CONFLICT, message);
  }
}
class UnprocessableEntityError extends AppError {
  constructor(message = "Invalid data") {
    super(UNPROCESSABLE_ENTITY, message);
  }
}
class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(TOO_MANY_REQUESTS, message);
  }
}
class BadGatewayError extends AppError {
  constructor(message = "Bad gateway") {
    super(BAD_GATEWAY, message);
  }
}
class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable") {
    super(SERVICE_UNAVAILABLE, message);
  }
}
class GatewayTimeoutError extends AppError {
  constructor(message = "Gateway timeout") {
    super(GATEWAY_TIMEOUT, message);
  }
}

function handleMongooseError(
  res,
  err,
  ctx = {},
  opts = { validationAs422: false }
) {
  console.error({
    msg: "controller_error",
    errName: err?.name,
    errMsg: err?.message,
    code: err?.code,
    ...ctx,
    ts: new Date().toISOString(),
  });

  if (err?.code === MONGO_DUPLICATE_KEY) {
    return res.status(CONFLICT).send({ message: "Duplicate key" });
  }

  if (
    err?.name === MONGOOSE_ERRORS.VALIDATION ||
    err?.name === MONGOOSE_ERRORS.CAST
  ) {
    const status = opts.validationAs422 ? UNPROCESSABLE_ENTITY : BAD_REQUEST;
    return res.status(status).send({ message: "Invalid data" });
  }

  if (
    err?.name === MONGOOSE_ERRORS.NOT_FOUND ||
    err?.statusCode === NOT_FOUND
  ) {
    return res.status(NOT_FOUND).send({ message: "Resource not found" });
  }

  return res
    .status(INTERNAL_SERVER_ERROR)
    .send({ message: SERVER_ERROR_MESSAGE });
}

function handleAppError(res, err, ctx = {}) {
  console.error({
    msg: "unhandled_error",
    errName: err?.name,
    errMsg: err?.message,
    code: err?.code,
    ...ctx,
    ts: new Date().toISOString(),
  });

  if (err && (err.statusCode || err instanceof AppError)) {
    const message = err.expose ? err.message : SERVER_ERROR_MESSAGE;
    return res.status(err.statusCode).send({ message });
  }

  if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") {
    return res.status(GATEWAY_TIMEOUT).send({ message: "Gateway timeout" });
  }
  if (err?.response && err.response.status >= 500) {
    return res.status(BAD_GATEWAY).send({ message: "Bad gateway" });
  }

  return res
    .status(INTERNAL_SERVER_ERROR)
    .send({ message: SERVER_ERROR_MESSAGE });
}

function ok(res, data) {
  return res.status(OK).send(data);
}
function created(res, data) {
  return res.status(CREATED).send(data);
}
function noContent(res) {
  return res.status(NO_CONTENT).end();
}

module.exports = {
  // Status codes
  OK,
  CREATED,
  NO_CONTENT,
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  UNPROCESSABLE_ENTITY,
  TOO_MANY_REQUESTS,
  INTERNAL_SERVER_ERROR,
  BAD_GATEWAY,
  SERVICE_UNAVAILABLE,
  GATEWAY_TIMEOUT,
  SERVER_ERROR_MESSAGE,
  // Mongoose identifiers
  MONGO_DUPLICATE_KEY,
  MONGOOSE_ERRORS,
  // AppError family
  AppError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableEntityError,
  TooManyRequestsError,
  BadGatewayError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  // Handlers + helpers
  handleMongooseError,
  handleAppError,
  ok,
  created,
  noContent,
};
