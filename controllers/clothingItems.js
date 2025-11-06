const ClothingItem = require("../models/clothingItem");
const {
  BAD_REQUEST,
  NOT_FOUND,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  SERVER_ERROR_MESSAGE,
  MONGO_DUPLICATE_KEY,
  MONGOOSE_ERRORS,
} = require("../utils/errors");

module.exports.likeItem = (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(BAD_REQUEST).send({ message: "User id is required" });
  }

  return ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $addToSet: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((item) => res.send(item))
    .catch((err) => {
      console.error(err);
      if (err.name === MONGOOSE_ERRORS.CAST) {
        return res.status(BAD_REQUEST).send({ message: "Invalid item id" });
      }
      if (err.name === MONGOOSE_ERRORS.NOT_FOUND) {
        return res.status(NOT_FOUND).send({ message: "Item not found" });
      }
      return res
        .status(INTERNAL_SERVER_ERROR)
        .send({ message: SERVER_ERROR_MESSAGE });
    });
};

module.exports.dislikeItem = (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(BAD_REQUEST).send({ message: "User id is required" });
  }

  return ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $pull: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .orFail()
    .then((item) => res.send(item))
    .catch((err) => {
      console.error(err);
      if (err.name === MONGOOSE_ERRORS.CAST) {
        return res.status(BAD_REQUEST).send({ message: "Invalid item id" });
      }
      if (err.name === MONGOOSE_ERRORS.NOT_FOUND) {
        return res.status(NOT_FOUND).send({ message: "Item not found" });
      }
      return res
        .status(INTERNAL_SERVER_ERROR)
        .send({ message: SERVER_ERROR_MESSAGE });
    });
};

module.exports.getItems = (req, res) => {
  ClothingItem.find({})
    .then((items) => res.send(items))
    .catch((err) => {
      console.error(err);
      res.status(INTERNAL_SERVER_ERROR).send({ message: SERVER_ERROR_MESSAGE });
    });
};

module.exports.createItem = (req, res) => {
  const { name, weather, imageUrl } = req.body;

  ClothingItem.create({ name, weather, imageUrl, owner: req.user._id })
    .then((item) => res.status(201).send(item))
    .catch((err) => {
      console.error(err);
      if (err.name === MONGOOSE_ERRORS.VALIDATION) {
        return res
          .status(BAD_REQUEST)
          .send({ message: "Invalid data for clothing item" });
      }
      if (err.code === MONGO_DUPLICATE_KEY) {
        return res.status(CONFLICT).send({ message: "Duplicate key" });
      }
      return res
        .status(INTERNAL_SERVER_ERROR)
        .send({ message: SERVER_ERROR_MESSAGE });
    });
};

module.exports.deleteItem = (req, res) => {
  const { itemId } = req.params;

  ClothingItem.findByIdAndDelete(itemId)
    .orFail()
    .then((deleted) => res.send(deleted))
    .catch((err) => {
      console.error(err);
      if (err.name === MONGOOSE_ERRORS.CAST) {
        return res.status(BAD_REQUEST).send({ message: "Invalid item id" });
      }
      if (err.name === MONGOOSE_ERRORS.NOT_FOUND) {
        return res.status(NOT_FOUND).send({ message: "Item not found" });
      }
      return res
        .status(INTERNAL_SERVER_ERROR)
        .send({ message: SERVER_ERROR_MESSAGE });
    });
};
