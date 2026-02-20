const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const {
  handleMongooseError,
  handleAppError,
  created,
  BAD_REQUEST,
  AppError,
  UnauthorizedError,
} = require("../utils/errors");
const { JWT_SECRET } = require("../utils/config");

module.exports.getCurrentUser = (req, res) => {
  User.findById(req.user._id)
    .orFail()
    .then((user) => res.send(user))
    .catch((err) =>
      handleMongooseError(res, err, {
        op: "getCurrentUser",
      })
    );
};

module.exports.updateCurrentUser = (req, res) => {
  const { name, avatar } = req.body;

  User.findByIdAndUpdate(
    req.user._id,
    { name, avatar },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((user) => res.send(user))
    .catch((err) =>
      handleMongooseError(res, err, {
        op: "updateCurrentUser",
        bodyKeys: Object.keys(req.body || {}),
      })
    );
};

module.exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return handleAppError(
      res,
      new AppError(BAD_REQUEST, "Invalid data"),
      {
        op: "login",
        bodyKeys: Object.keys(req.body || {}),
      }
    );
  }

  return User.findUserByCredentials(email, password)
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.send({ token });
    })
    .catch((err) => {
      if (err && err.message === "Incorrect email or password") {
        return handleAppError(
          res,
          new UnauthorizedError("Incorrect email or password"),
          { op: "login" }
        );
      }

      return handleAppError(res, err, { op: "login" });
    });
};

module.exports.createUser = (req, res) => {
  const { name, avatar, email, password } = req.body;

  if (!email || !password) {
    return handleAppError(
      res,
      new AppError(BAD_REQUEST, "Invalid data"),
      {
        op: "createUser",
        bodyKeys: Object.keys(req.body || {}),
      }
    );
  }

  return bcrypt
    .hash(password, 10)
    .then((hash) => User.create({ name, avatar, email, password: hash }))
    .then((user) => {
      const userObj = user.toObject();
      delete userObj.password;
      return created(res, userObj);
    })
    .catch((err) =>
      handleMongooseError(res, err, {
        op: "createUser",
        bodyKeys: Object.keys(req.body || {}),
      })
    );
};
