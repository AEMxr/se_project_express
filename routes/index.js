const { NOT_FOUND } = require("../utils/errors");
const router = require("express").Router();
const usersRouter = require("./users");
const itemsRouter = require("./clothingItems");
const debugErrorsRouter = require("./debugErrors");

router.use("/users", usersRouter);
router.use("/items", itemsRouter);
router.use("/test-errors", debugErrorsRouter);

router.use((req, res) => {
  res.status(NOT_FOUND).send({ message: "Requested resource not found" });
});

module.exports = router;
