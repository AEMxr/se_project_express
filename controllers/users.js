const User = require("../models/user");
const { handleMongooseError, created } = require("../utils/errors");

module.exports.getUsers = (req, res) => {
  User.find({})
    .then((users) => res.send(users))
    .catch((err) => handleMongooseError(res, err, { op: "getUsers" }));
};

module.exports.getUser = (req, res) => {
  const { userId } = req.params;

  User.findById(userId)
    .orFail()
    .then((user) => res.send(user))
    .catch((err) => handleMongooseError(res, err, { op: "getUser", userId }));
};

module.exports.createUser = (req, res) => {
  const { name, avatar } = req.body;

  User.create({ name, avatar })
    .then((user) => created(res, user))
    .catch((err) =>
      handleMongooseError(res, err, {
        op: "createUser",
        bodyKeys: Object.keys(req.body || {}),
      })
    );
};
