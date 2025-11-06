const User = require("../models/user");
const {
  BAD_REQUEST,
  NOT_FOUND,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  SERVER_ERROR_MESSAGE,
  MONGO_DUPLICATE_KEY,
  MONGOOSE_ERRORS,
} = require("../utils/errors");

module.exports.getUsers = (req, res) => {
  User.find({})
    .then((users) => res.send(users))
    .catch((err) => {
      console.error(err);
      res.status(INTERNAL_SERVER_ERROR).send({ message: SERVER_ERROR_MESSAGE });
    });
};

module.exports.getUser = (req, res) => {
  const { userId } = req.params;

  User.findById(userId)
    .orFail()
    .then((user) => res.send(user))
    .catch((err) => {
      console.error(err);
      if (err.name === MONGOOSE_ERRORS.CAST) {
        return res.status(BAD_REQUEST).send({ message: "Invalid user id" });
      }
      if (err.name === MONGOOSE_ERRORS.NOT_FOUND) {
        return res.status(NOT_FOUND).send({ message: "User not found" });
      }
      return res
        .status(INTERNAL_SERVER_ERROR)
        .send({ message: SERVER_ERROR_MESSAGE });
    });
};

module.exports.createUser = (req, res) => {
  const { name, avatar } = req.body;

  User.create({ name, avatar })
    .then((user) => res.status(201).send(user))
    .catch((err) => {
      console.error(err);
      if (err.name === MONGOOSE_ERRORS.VALIDATION) {
        return res
          .status(BAD_REQUEST)
          .send({ message: "Invalid data for user" });
      }
      if (err.code === MONGO_DUPLICATE_KEY) {
        return res.status(CONFLICT).send({ message: "Duplicate key" });
      }
      return res
        .status(INTERNAL_SERVER_ERROR)
        .send({ message: SERVER_ERROR_MESSAGE });
    });
};
