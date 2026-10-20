const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { created } = require("../utils/errors");
const { JWT_SECRET } = require("../utils/config");

module.exports.getCurrentUser = (req, res, next) =>
  User.findById(req.user._id)
    .orFail()
    .then((user) => res.send(user))
    .catch(next);

module.exports.updateCurrentUser = (req, res, next) => {
  const { name, avatar } = req.body;
  return User.findByIdAndUpdate(
    req.user._id,
    { name, avatar },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((user) => res.send(user))
    .catch(next);
};

module.exports.login = (req, res, next) => {
  const { email, password } = req.body;
  return User.findUserByCredentials(email, password)
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.send({ token });
    })
    .catch(next);
};

module.exports.createUser = (req, res, next) => {
  const { name, avatar, email, password } = req.body;
  return bcrypt
    .hash(password, 10)
    .then((hash) => User.create({ name, avatar, email, password: hash }))
    .then((user) => {
      const userObj = user.toObject();
      delete userObj.password;
      return created(res, userObj);
    })
    .catch(next);
};
