const express = require("express");
const mongoose = require("mongoose");
const routes = require("./routes");
const { handleAppError, BAD_REQUEST } = require("./utils/errors");

const { PORT = 3001, MONGODB_URI = "mongodb://127.0.0.1:27017/wtwr_db" } =
  process.env;
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send({ status: "ok" });
});

app.use((req, res, next) => {
  req.user = {
    _id: "690bd653c377af587dd14dc1",
  };
  next();
});

app.use("/", routes);

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(BAD_REQUEST).send({ message: "Invalid data" });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  handleAppError(res, err, {
    path: req.path,
    method: req.method,
    hasNext: typeof next === "function",
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.warn("MongoDB connected");
    app.listen(PORT, () => {
      console.warn(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

module.exports = app;
