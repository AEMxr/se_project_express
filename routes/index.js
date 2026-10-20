const router = require("express").Router();
const { NotFoundError } = require("../utils/errors");
const auth = require("../middlewares/auth");
const {
  validateSignup,
  validateSignin,
  validateWeatherQuery,
} = require("../middlewares/validation");
const { getCurrentWeather } = require("../controllers/weather");
const { createWeatherLimiter } = require("../middlewares/weatherLimiter");
const usersRouter = require("./users");
const itemsRouter = require("./clothingItems");
const debugErrorsRouter = require("./debugErrors");
const { login, createUser } = require("../controllers/users");
const { getItems } = require("../controllers/clothingItems");

router.get("/", (req, res) => {
  res.send({ status: "ok" });
});
router.post("/signin", validateSignin, login);
router.post("/signup", validateSignup, createUser);
router.get("/items", getItems);
router.get(
  "/weather",
  createWeatherLimiter(),
  validateWeatherQuery,
  getCurrentWeather
);
router.use("/test-errors", (req, res, next) => {
  if (!["development", "test"].includes(process.env.NODE_ENV)) {
    return next(new NotFoundError("Requested resource not found"));
  }
  return debugErrorsRouter(req, res, next);
});
router.use(auth);
router.use("/users", usersRouter);
router.use("/items", itemsRouter);
router.use((req, res, next) => {
  next(new NotFoundError("Requested resource not found"));
});

module.exports = router;
