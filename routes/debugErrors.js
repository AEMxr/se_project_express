const router = require("express").Router();
const {
  BAD_REQUEST,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  UnprocessableEntityError,
  TooManyRequestsError,
  BadGatewayError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  AppError,
  INTERNAL_SERVER_ERROR,
} = require("../utils/errors");

router.get("/400", (req, res) =>
  res.status(BAD_REQUEST).send({ message: "Invalid data" }),
);

router.get("/401", (req, res, next) => {
  next(new UnauthorizedError());
});

router.get("/403", (req, res, next) => {
  next(new ForbiddenError());
});

router.get("/409", (req, res, next) => {
  next(new ConflictError());
});

router.get("/422", (req, res, next) => {
  next(new UnprocessableEntityError());
});

router.get("/429", (req, res, next) => {
  next(new TooManyRequestsError());
});

router.get("/502", (req, res, next) => {
  next(new BadGatewayError());
});

router.get("/503", (req, res, next) => {
  next(new ServiceUnavailableError());
});

router.get("/504", (req, res, next) => {
  next(new GatewayTimeoutError());
});

router.get("/500", (req, res, next) => {
  next(new AppError(INTERNAL_SERVER_ERROR, "Internal test error", false));
});

module.exports = router;

