const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { errors } = require("celebrate");
const loadEnvironment = require("./utils/loadEnvironment");

// Configuration must be loaded before routes import the signing secret.
loadEnvironment();

const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const { createLoggers } = require("./middlewares/logger");

const { PORT = 3001, MONGODB_URI = "mongodb://127.0.0.1:27017/wtwr_db" } =
  process.env;
const { requestLogger, errorLogger } = createLoggers();
const app = express();

app.use(requestLogger);
app.use(cors());
app.use(express.json());
app.use("/", routes);
app.use(errorLogger);
app.use(errors());
app.use(errorHandler);

if (require.main === module) {
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
}

module.exports = app;
