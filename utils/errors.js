const AppError = require("./AppError");

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

const buildAppError = (statusCode, defaultMessage, name) =>
  class extends AppError {
    constructor(message = defaultMessage) {
      super(statusCode, message);
      this.name = name;
    }
  };

const BadRequestError = buildAppError(
  BAD_REQUEST,
  "Invalid data",
  "BadRequestError"
);
const UnauthorizedError = buildAppError(
  UNAUTHORIZED,
  "Unauthorized",
  "UnauthorizedError"
);
const ForbiddenError = buildAppError(FORBIDDEN, "Forbidden", "ForbiddenError");
const NotFoundError = buildAppError(
  NOT_FOUND,
  "Resource not found",
  "NotFoundError"
);
const ConflictError = buildAppError(CONFLICT, "Conflict", "ConflictError");
const UnprocessableEntityError = buildAppError(
  UNPROCESSABLE_ENTITY,
  "Invalid data",
  "UnprocessableEntityError"
);
const TooManyRequestsError = buildAppError(
  TOO_MANY_REQUESTS,
  "Too many requests",
  "TooManyRequestsError"
);
const BadGatewayError = buildAppError(
  BAD_GATEWAY,
  "Bad gateway",
  "BadGatewayError"
);
const ServiceUnavailableError = buildAppError(
  SERVICE_UNAVAILABLE,
  "Service unavailable",
  "ServiceUnavailableError"
);
const GatewayTimeoutError = buildAppError(
  GATEWAY_TIMEOUT,
  "Gateway timeout",
  "GatewayTimeoutError"
);

function normalizeError(err) {
  if (
    err instanceof AppError &&
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
  ) {
    return err;
  }
  if (err?.code === MONGO_DUPLICATE_KEY) {
    return new ConflictError("Duplicate key");
  }
  if (
    err?.name === MONGOOSE_ERRORS.VALIDATION ||
    err?.name === MONGOOSE_ERRORS.CAST ||
    err?.type === "entity.parse.failed"
  ) {
    return new BadRequestError();
  }
  if (err?.type === "entity.too.large") {
    return new AppError(413, "Request body is too large");
  }
  if (err?.name === MONGOOSE_ERRORS.NOT_FOUND) {
    return new NotFoundError();
  }
  if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") {
    return new GatewayTimeoutError();
  }
  if (err?.response?.status >= 500) {
    return new BadGatewayError();
  }
  return new AppError(INTERNAL_SERVER_ERROR, SERVER_ERROR_MESSAGE, false);
}

function handleAppError(res, err) {
  const error = normalizeError(err);
  const message =
    error.statusCode === INTERNAL_SERVER_ERROR || !error.expose
      ? SERVER_ERROR_MESSAGE
      : error.message;
  return res.status(error.statusCode).send({ message });
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
  MONGO_DUPLICATE_KEY,
  MONGOOSE_ERRORS,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  TooManyRequestsError,
  BadGatewayError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  normalizeError,
  handleAppError,
  ok,
  created,
  noContent,
};
