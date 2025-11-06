"use strict";
const express = require("express");
const mongoose = require("mongoose");
const routes = require("./routes");

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

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

module.exports = app;
